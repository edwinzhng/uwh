- Pricing checked November 2, 2026. The requested workload is approximately 10 GB of new videos each month, including individual files around 750 MB, with all videos retained. Playback volume is unknown. The comparison below is for storage, not transcoding or the rest of the app’s backend bill.

- Retained videos: 10 GB; Backblaze B2: $0; Cloudflare R2 Standard: $0; AWS S3 Standard, US East: $0.23; Convex Starter, US region: $0.30
- Retained videos: 120 GB, approximately one year; Backblaze B2: $0.76; Cloudflare R2 Standard: $1.65; AWS S3 Standard, US East: $2.76; Convex Starter, US region: $3.93
- Retained videos: 360 GB, approximately three years; Backblaze B2: $2.43; Cloudflare R2 Standard: $5.25; AWS S3 Standard, US East: $8.28; Convex Starter, US region: $11.85

- USD per month at the retained size shown, before tax, requests and other usage. Gradually uploading during a month reduces the average storage charge. Included allowances are shared with other account usage; they are not fresh capacity that accumulates every month.

- [Backblaze B2](https://www.backblaze.com/cloud-storage/pricing): first 10 GB stored free, then approximately $0.00695/GB-month. Downloads up to three times average monthly storage are included; additional direct egress is $0.01/GB. Cheapest storage in this comparison when viewing stays within that allowance.
- [Cloudflare R2 Standard](https://developers.cloudflare.com/r2/pricing/): first 10 GB-month included, then $0.015/GB-month. Internet egress is free. The included monthly operation allowances comfortably exceed the expected number of club-sized video uploads. A useful default when predictable playback cost matters more than the small storage-price difference.
- [AWS S3](https://aws.amazon.com/s3/pricing/): approximately $0.023/GB-month in US East. [CloudFront pay-as-you-go](https://aws.amazon.com/cloudfront/faqs/) includes 1 TB of monthly outbound transfer and 10 million HTTP/HTTPS requests. S3 plus CloudFront is reasonable if the club already uses AWS. Keep the bucket private, use origin access control and signed playback URLs, and configure a small billing alert.
- [Convex](https://www.convex.dev/pricing): Starter has no base subscription fee, includes 1 GB storage and 1 GB monthly egress, then charges $0.033/GB-month and $0.132/GB egress in US regions. At 120 GB stored and 100 GB served, those two meters total about $17/month. Professional is $25/developer/month and includes 100 GB storage and 50 GB egress; its incremental rates are $0.03/GB-month and $0.12/GB. Compute, other app usage and backups can add costs. [Limits and billing definitions](https://docs.convex.dev/production/state/limits).

- Object storage is affordable for this workload. There is no need to optimize solely for a temporary free tier. B2 minimizes storage cost; R2 makes repeated viewing inexpensive; AWS is also a modest bill at this scale. Convex minimizes infrastructure work but charges more for playback.

- YouTube is an optional external video-publishing integration, not an equivalent private file store. [Private videos require specific viewer sharing, while anyone with an unlisted link can view and reshare it](https://support.google.com/youtube/answer/157177). Those audiences do not automatically follow the app’s player permissions. Uploading club videos to a YouTube account would require a separate, explicit integration decision.

- The app currently stores resource files in Convex and limits video uploads to 50 MiB in `src/domain/resources.ts`. No storage provider, billing plan or existing files were changed by this research.

- Supporting 750 MB reliably requires an upload-path change, rather than simply raising that limit:

- Keep permission checks, resource metadata, player audiences and comments in Convex.
- Upload large files directly to private object storage with resumable multipart parts and visible progress, retry and cancellation. [R2’s multipart documentation](https://developers.cloudflare.com/r2/objects/upload-objects/) describes retrying failed parts without restarting the entire file.
- Bind upload completion to the uploader, club, exact object key, expected size and media type. Inspect the stored object’s header through a range read; do not load an entire 750 MB file into a Node action for validation.
- Authorize every playback request against current resource access, then issue a short-lived signed URL supporting HTTP Range. Do not expose a public bucket or proxy every video byte through a metered backend action.
- Retain support for existing Convex files, clean up abandoned multipart uploads and unfinished objects, and test membership revocation, interrupted uploads and seeking before migration.

- Convex’s [direct upload URL](https://docs.convex.dev/file-storage/upload-files) has no stated file-size limit but a two-minute POST timeout. That can be unreliable for a 750 MB file on a phone connection. The current HTTP proxy and whole-blob ingest path also need review before increasing limits. Native background continuation is a separate device capability and must not be inferred from a web upload test.

- The chosen provider is not yet configured. Large-file uploads remain at the current limit until the upload and playback paths are implemented and verified.
