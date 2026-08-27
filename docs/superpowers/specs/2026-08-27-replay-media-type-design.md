# Replay Media Type Design

## Scope

Fix `BUG-BASE01-UC05-01` without changing the live-room API or introducing a new persistence model. A browser-recorded replay must be uploaded with a container MIME that survives multipart parsing, and the live service must not register a non-media asset as a playable replay.

## Root cause evidence

`MediaRecorder.mimeType` is currently copied directly to the replay `Blob` and `File`. For Chromium recordings this is commonly `video/webm;codecs=vp9,opus`. A local FormData -> Multer reproduction on the locked project dependencies produced:

```text
video/webm;codecs=vp9,opus -> text/plain
video/webm                  -> video/webm
```

`VideoService.uploadFile` passes Multer's `file.mimetype` unchanged to `MinioService.uploadObject`, so the degraded `text/plain` becomes the stored MinIO `Content-Type`. `LiveService.saveReplay` currently accepts that asset and returns its URL as playable even though the MIME is not a supported replay type.

## Design

1. Add a frontend replay-file utility that converts parameterized MediaRecorder types to a container MIME and matching extension. The current recording candidates all produce WebM, so `video/webm;codecs=...` becomes `video/webm` and the filename remains `.webm`.
2. Use the canonical container MIME both when assembling the stopped recording Blob and when creating the upload File. This fixes the value at its source before multipart serialization.
3. In `LiveService.saveReplay`, accept only replay assets whose normalized MIME is `video/webm` or `video/mp4`. Reject `text/plain`, empty, and unrelated media with HTTP 400 before mutating room state or creating a draft.
4. Keep the returned replay URL as the validated original WebM URL. Chromium, the Smoke browser, supports WebM. Existing asynchronous video-draft transcoding remains unchanged.

## Rejected alternatives

- Do not force every `.webm` upload to `video/webm` in the backend. Extension-only rewriting would hide invalid uploads and conflict with `BUG-BASE01-UC03-01` validation.
- Do not synchronously transcode during `saveReplay`. It would make the request depend on a long FFmpeg job and would duplicate the existing media-processing pipeline.
- Do not return the draft video's future MP4 URL. Transcoding is asynchronous and `saveReplay` cannot truthfully return an artifact that does not exist yet.

## Verification boundary

Automated tests cover MIME normalization, filename/container consistency, valid WebM/MP4 replay registration, and rejection without room/video mutation. Lint, build, requirements, backend, frontend, and root `test:ci` must pass. A real MediaRecorder/MinIO/browser replay is reported separately and remains `NOT RUN` unless actually executed.
