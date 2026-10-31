<?php

namespace Tests\Feature;

use Tests\TestCase;

class HashGeneratorTest extends TestCase
{
    public function test_the_form_starts_from_the_app_hashing_settings()
    {
        config(['hashing.driver' => 'argon2id', 'hashing.argon' => ['memory' => 32768, 'time' => 3, 'threads' => 2]]);

        $this->get('/hash-generator')->assertInertia(fn ($page) => $page
            ->where('defaults.algorithm', 'argon2id')
            ->where('defaults.memory', 32768)
            ->where('defaults.time', 3)
            ->where('defaults.threads', 2));
    }

    public function test_it_creates_an_argon2id_hash_with_the_requested_options()
    {
        $response = $this->postJson('/hash-generator/hash', [
            'algorithm' => 'argon2id',
            'value' => 'secret',
            'memory' => 16384,
            'time' => 2,
            'threads' => 1,
        ])->assertOk();

        $hash = $response->json('hash');
        $this->assertStringStartsWith('$argon2id$v=19$m=16384,t=2,p=1$', $hash);
        $this->assertTrue(password_verify('secret', $hash));
    }

    public function test_it_creates_a_bcrypt_hash_with_the_requested_cost()
    {
        $hash = $this->postJson('/hash-generator/hash', ['algorithm' => 'bcrypt', 'value' => 'secret', 'cost' => 5])
            ->assertOk()
            ->json('hash');

        $this->assertStringStartsWith('$2y$05$', $hash);
        $this->assertTrue(password_verify('secret', $hash));
    }

    public function test_it_rejects_costs_outside_the_allowed_range()
    {
        $this->postJson('/hash-generator/hash', ['algorithm' => 'bcrypt', 'value' => 'x', 'cost' => 20])->assertJsonValidationErrors('cost');
        $this->postJson('/hash-generator/hash', ['algorithm' => 'argon2id', 'value' => 'x', 'memory' => 10_000_000, 'time' => 1, 'threads' => 1])
            ->assertJsonValidationErrors('memory');
    }

    public function test_bcrypt_rejects_input_longer_than_72_bytes()
    {
        $this->postJson('/hash-generator/hash', ['algorithm' => 'bcrypt', 'value' => str_repeat('a', 73), 'cost' => 4])
            ->assertJsonValidationErrors('value');
    }

    public function test_it_verifies_bcrypt_and_argon2id_hashes()
    {
        foreach ([password_hash('secret', PASSWORD_BCRYPT, ['cost' => 4]), password_hash('secret', PASSWORD_ARGON2ID, ['memory_cost' => 8192, 'time_cost' => 1])] as $hash) {
            $this->postJson('/hash-generator/verify', ['value' => 'secret', 'hash' => $hash])->assertOk()->assertJson(['match' => true]);
            $this->postJson('/hash-generator/verify', ['value' => 'wrong', 'hash' => $hash])->assertOk()->assertJson(['match' => false]);
        }
    }

    public function test_it_rejects_unknown_or_too_expensive_hashes()
    {
        $this->postJson('/hash-generator/verify', ['value' => 'x', 'hash' => md5('x')])->assertJsonValidationErrors('hash');
        $this->postJson('/hash-generator/verify', ['value' => 'x', 'hash' => '$2y$15$'.str_repeat('a', 53)])->assertJsonValidationErrors('hash');
    }
}
