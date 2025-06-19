name: Deploy to Firebase Hosting

on:
  push:
    branches: [ "main" ]

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Replace Firebase config placeholders
        env:
          FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          FIREBASE_DATABASE_URL: ${{ secrets.FIREBASE_DATABASE_URL }}
          FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
          FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
          FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
        run: |
          # Reemplaza en todos los archivos JS que contengan la configuración
          find src -type f -name "*.js" -exec sed -i \
            -e "s|{{FIREBASE_API_KEY}}|${FIREBASE_API_KEY}|g" \
            -e "s|{{FIREBASE_AUTH_DOMAIN}}|${FIREBASE_AUTH_DOMAIN}|g" \
            -e "s|{{FIREBASE_DATABASE_URL}}|${FIREBASE_DATABASE_URL}|g" \
            -e "s|{{FIREBASE_PROJECT_ID}}|${FIREBASE_PROJECT_ID}|g" \
            -e "s|{{FIREBASE_STORAGE_BUCKET}}|${FIREBASE_STORAGE_BUCKET}|g" \
            -e "s|{{FIREBASE_MESSAGING_SENDER_ID}}|${FIREBASE_MESSAGING_SENDER_ID}|g" \
            -e "s|{{FIREBASE_APP_ID}}|${FIREBASE_APP_ID}|g" {} \;

      - name: Install dependencies
        run: npm install

      - name: Build project
        run: npm run build

      - name: Deploy to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: ${{ secrets.FIREBASE_PROJECT_ID }}
          channelId: live
