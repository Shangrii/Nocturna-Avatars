# Deferred Items — Phase 05

Out-of-scope discoveries logged during execution (scope-boundary rule). Not fixed; not blockers for Phase 5.

## 05-05: Live bot env does not satisfy the pre-existing meetings/voice pins

- **Found during:** 05-05 Task 2 prep (pip dry-run in the live checkout `../Discord Bot`).
- **Observation:** `pip install -r requirements.txt --dry-run` would install/upgrade the pre-existing meetings/voice stack: `discord.py[voice] 2.5.2 → ==2.7.1` (DAVE/E2EE pin), `discord-ext-voice-recv`, `PyNaCl`, `faster-whisper` (+ ctranslate2/onnxruntime/tokenizers...). The `.env` comments confirm the meetings setup is already known-incomplete ("Falta drivers NVIDIA + libs CUDA").
- **Phase-5 relevance:** none — the only Phase-5 runtime deps are `Pillow>=12.0.0` (installed 12.3.0) and `requests>=2.31.0` (installed 2.32.3), both satisfied. The gallery cog's 54-test suite passes in the live checkout with the live env (discord.py 2.5.2).
- **Action deferred:** syncing the live env to the full `requirements.txt` (discord.py 2.7.1 + whisper/voice deps) is a meetings-feature deployment decision for the user, separate from Phase 5.
