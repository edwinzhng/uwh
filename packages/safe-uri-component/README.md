# Safe URI component decoding

Temporary compatibility replacement for Expo Router's transitive `decode-uri-component`, affected by GHSA-vcc3-ghjq-m6fr with no patched npm release available at this review.

Valid components use the native decoder, including plus-to-space conversion. Malformed encodings remain literal rather than entering the dependency's recursive recovery algorithm. This deliberately avoids partial decoding of invalid UTF-8. Keep the regression test through an eventual upstream replacement.
