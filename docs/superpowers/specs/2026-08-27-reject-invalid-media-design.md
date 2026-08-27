# BUG-BASE01-UC03-01 Invalid Media Rejection Design

## Goal

Reject non-video uploads before they create a MinIO object, `VideoAsset`, or `Video`, while keeping valid creator uploads and live WebM recordings compatible.

## Boundaries

- `ORIGINAL` and `RECORDING` uploads require a supported extension, a supported MIME type, and an FFprobe-confirmed video stream.
- `COVER` behavior is unchanged because this defect concerns video media; cover hardening is a separate task.
- The public upload and draft APIs keep their existing request and success response shapes. Invalid media returns HTTP 400; unavailable FFprobe returns HTTP 503.
- No new configuration or database migration is introduced. Existing `ffprobe-static`, `FFPROBE_PATH`, and system FFprobe discovery are reused.

## Data Flow

1. The upload page validates the selected file name and MIME type. Invalid selection is cleared and an explicit message is shown.
2. The submit handler repeats the same check so programmatic or stale state cannot bypass it.
3. `VideoService.uploadFile` asks `MediaService` to validate video metadata and probe a temporary copy of the in-memory buffer before calling MinIO.
4. Only validated media is uploaded. If `VideoAsset.create` fails after the object write, the exact object is deleted before the original database error is rethrown.
5. Because an invalid upload has no asset token, the frontend never calls `createVideo`; no draft can be created.

## Components

- `backend/src/modules/video/video-upload-validation.ts`: shared extension/MIME allow-list, metadata assertion, and FFprobe JSON parser.
- `backend/src/modules/video/media.service.ts`: temporary-file FFprobe orchestration and cleanup.
- `backend/src/modules/video/video.service.ts`: validation-before-write ordering and MinIO compensation on database failure.
- `frontend/src/utils/mediaFileValidation.ts`: browser-side mirror of accepted extension/MIME pairs and user-facing error resolution.
- `frontend/src/views/upload/UploadView.vue`: selection and submission guards.

## Failure Semantics

- Unsupported extension, unsupported MIME, extension/MIME mismatch, empty file, malformed container, or missing video stream: HTTP 400 `Invalid video file` (with a more specific metadata message where safe).
- No working FFprobe binary: HTTP 503 `Video validation is unavailable` and no persistent write.
- Database failure after MinIO upload: delete only the just-created object, log cleanup failure without hiding the original database error.

## Verification

- Backend tests cover `.txt`, spoofed `.mp4` text, missing video streams, accepted metadata, validation-before-write, and database-failure object cleanup.
- Frontend tests cover accepted MP4/WebM and rejected text, missing MIME, and mismatched extension/MIME.
- Run backend/frontend focused tests, requirements 97/97, lint, builds, and generated-artifact/diff audits.
