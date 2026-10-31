<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Creates and verifies bcrypt / Argon2id hashes. Inputs are never stored or logged.
 * Cost parameters are capped so a single request stays under ~1.5s.
 */
class HashController extends Controller
{
    public function index(): Response
    {
        // The form starts from the app's own hashing settings (HASH_DRIVER, ARGON_*, BCRYPT_ROUNDS).
        return Inertia::render('hash-generator/index', [
            'defaults' => [
                'algorithm' => config('hashing.driver') === 'bcrypt' ? 'bcrypt' : 'argon2id',
                'cost' => (int) config('hashing.bcrypt.rounds'),
                'memory' => (int) config('hashing.argon.memory'),
                'time' => (int) config('hashing.argon.time'),
                'threads' => (int) config('hashing.argon.threads'),
            ],
        ]);
    }

    public function hash(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'algorithm' => ['required', 'in:bcrypt,argon2id'],
            'value' => ['required', 'string', 'max:4096'],
            'cost' => ['required_if:algorithm,bcrypt', 'integer', 'between:4,14'],
            'memory' => ['required_if:algorithm,argon2id', 'integer', 'between:1024,262144'],
            'time' => ['required_if:algorithm,argon2id', 'integer', 'between:1,10'],
            'threads' => ['required_if:algorithm,argon2id', 'integer', 'between:1,4'],
        ]);

        // bcrypt silently ignores everything after 72 bytes, so refuse instead of producing a misleading hash.
        if ($validated['algorithm'] === 'bcrypt' && strlen($validated['value']) > 72) {
            throw ValidationException::withMessages([
                'value' => 'bcrypt only uses the first 72 bytes of input. Shorten the text or use Argon2id.',
            ]);
        }

        $options = $validated['algorithm'] === 'bcrypt'
            ? ['rounds' => (int) $validated['cost']]
            : ['memory' => (int) $validated['memory'], 'time' => (int) $validated['time'], 'threads' => (int) $validated['threads']];

        $started = hrtime(true);
        $hash = Hash::driver($validated['algorithm'])->make($validated['value'], $options);

        return response()->json([
            'hash' => $hash,
            'algorithm' => $validated['algorithm'],
            'milliseconds' => (int) round((hrtime(true) - $started) / 1e6),
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'value' => ['required', 'string', 'max:4096'],
            'hash' => ['required', 'string', 'max:512'],
        ]);

        $info = Hash::info($validated['hash']);
        $driver = match ($info['algoName']) {
            'bcrypt' => 'bcrypt',
            'argon2id' => 'argon2id',
            'argon2i' => 'argon',
            default => null,
        };

        if (! $driver) {
            throw ValidationException::withMessages(['hash' => 'This is not a bcrypt or Argon2 hash.']);
        }

        // Refuse hashes whose cost would make verification expensive.
        $options = $info['options'];
        if (($options['cost'] ?? 0) > 14 || ($options['memory_cost'] ?? 0) > 262144 || ($options['time_cost'] ?? 0) > 10 || ($options['threads'] ?? 0) > 4) {
            throw ValidationException::withMessages(['hash' => 'This hash uses cost settings above what this tool allows.']);
        }

        return response()->json([
            'match' => Hash::driver($driver)->check($validated['value'], $validated['hash']),
            'algorithm' => $info['algoName'],
            'options' => $info['options'],
        ]);
    }
}
