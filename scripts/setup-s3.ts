import { CreateBucketCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "../src/lib/storage";

async function main() {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
    console.log(`Created bucket "${BUCKET}".`);
  } catch (e) {
    const code = (e as { Code?: string; name?: string }).Code ?? (e as Error).name;
    if (code === "BucketAlreadyOwnedByYou" || code === "BucketAlreadyExists") {
      console.log(`Bucket "${BUCKET}" already exists.`);
      return;
    }
    throw e;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
