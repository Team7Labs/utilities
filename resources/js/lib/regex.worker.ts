import { type RegexRequest, runRegex } from './regex';

self.onmessage = (event: MessageEvent<RegexRequest>) => {
    self.postMessage(runRegex(event.data));
};
