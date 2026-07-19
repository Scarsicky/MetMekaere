# 📄 MetMekaere – Release Notes Template

## 🔖 Versie-informatie
- **App Name:** MetMekaere  
- **App ID:** `nl.metmekaere`  
- **Versie (semver):** `X.Y.Z`  
- **Buildnummer:** `<integer>`  

---

## ✨ Nieuwe features
- …

## 🛠 Fixes
- …

## ⚠️ Bekende issues
- …

---

## 📱 Store assets
- **Screenshots:** `<lijst of links>`  
- **App-icon:** `<pad of link>`  
- **Privacybeleid URL:** `<url>`  
- **Contactinformatie:** `<email/website>`  

---

## ✅ Checklist voor release
- [ ] `versionName` verhoogd naar `X.Y.Z`
- [ ] `versionCode` (Android) of `CFBundleVersion` (iOS) verhoogd (+1)  
- [ ] App getest op device/emulator  
- [ ] Release notes ingevuld  
- [ ] Privacybeleid en contactinformatie up-to-date  
- [ ] Nieuwe screenshots (indien UI veranderd)  
- [ ] Build geüpload (.aab voor Android / .ipa voor iOS)  

## commands voor release
- pas versienummer aan in package.json
- npm run build
- firebase deploy --only hosting
- check website \ force reload

