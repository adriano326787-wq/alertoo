# Restringir Google Maps API Key

**API Key atual:** `AIzaSyDmqo0-5DJzaebbFpGzejpXIwQCbOr9Ti8`

## Passos no Google Cloud Console

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Selecione o projeto **lei-seca---eventos**
3. Clique na chave `AIzaSyDmqo0-5DJzaebbFpGzejpXIwQCbOr9Ti8`

### Restrições de aplicativo
- Selecione **"Aplicativos Android"**
- Adicione os dois certificados:

| Nome | Package | SHA-1 |
|------|---------|-------|
| Alertoo Debug | `com.alertoo.app` | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` |
| Alertoo Release | `com.alertoo.app` | `F7:39:C2:26:53:6F:F4:0D:09:B0:61:FA:13:4E:F8:A5:85:03:D7:8B` |

### Restrições de API
- Selecione **"Restringir chave"**
- Marque apenas:
  - ✅ Maps SDK for Android
  - ✅ Geocoding API (se usar reverse geocode)
  - ✅ Places API (se usar search de lugares)

4. Clique **Salvar**

> ⚠️ Depois de restringir, aguarde ~5 minutos para propagar.
> Teste no emulador com `adb logcat | grep "Maps"` para confirmar que não há erros de autenticação.
