#!/bin/bash

FILE="./node_modules/firebase-admin/node_modules/@google-cloud/storage/build/cjs/src/crc32c.d.ts"

if [ -f "$FILE" ]; then
  echo "Patching $FILE..."
  sed -i 's/Int32Array<ArrayBuffer>/Int32Array/g' "$FILE"
  echo "Patch applied successfully."
else
  echo "File not found: $FILE"
fi
