// ─── Recording this browser tab ───────────────────────────────────────────────
//
// Adapted from the Record button in docs/flows/player.html of Act (https://github.com/Rotorsoft/act-root), under this
// licence:
//
// MIT License
//
// Copyright (c) 2021 Roger Torres
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
// to permit persons to whom the Software is furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of
// the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
// THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

const TYPES = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm'];

export interface TabRecording {
    /** Ends the recording and saves the file. Calling it again does nothing. */
    stop: () => Promise<void>;
}

export function canRecordTab(): boolean {
    const touch = typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    return !touch && typeof MediaRecorder !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function';
}

export const recordingFileName = (title: string, type: string) =>
    `${title.trim().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'walkthrough'}-walkthrough.${type.startsWith('video/mp4') ? 'mp4' : 'webm'}`;

/**
 * Asks the browser to capture this tab and starts recording. Undefined when the viewer declines or the browser
 * cannot. `onEnded` is told when the capture ends from the browser's own "stop sharing" control.
 */
export async function recordTab(title: string, onEnded: () => void): Promise<TabRecording | undefined> {
    let stream: MediaStream;
    try {
        stream = await navigator.mediaDevices.getDisplayMedia({
            video: { frameRate: 60, displaySurface: 'browser' }, audio: false,
            preferCurrentTab: true, selfBrowserSurface: 'include',
        } as DisplayMediaStreamOptions);
    } catch {
        return undefined;
    }
    const type = TYPES.find(candidate => MediaRecorder.isTypeSupported(candidate));
    if (!type) {
        stream.getTracks().forEach(track => track.stop());
        return undefined;
    }
    const recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 10e6 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
    const stopped = new Promise<void>(resolve => { recorder.onstop = () => resolve(); });
    recorder.start();
    let finished: Promise<void> | undefined;
    const stop = () => {
        finished ??= (async () => {
            if (recorder.state !== 'inactive') recorder.stop();
            stream.getTracks().forEach(track => track.stop());
            await stopped;
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob(chunks, { type }));
            link.download = recordingFileName(title, type);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
        })();
        return finished;
    };
    stream.getVideoTracks()[0]?.addEventListener('ended', onEnded);
    return { stop };
}
