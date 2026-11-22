# 🎭 Who Am I? — multiplayer party game

Everyone sees everyone's secret identity except their own. Ask yes/no questions, guess who you are, score points.

**Stack:** React 18 + Vite + Tailwind CSS · Node + Express + Socket.io (authoritative server, in-memory rooms).
No Supabase / database / API keys are needed.

## Run locally
```bash
npm install
npm run dev        # server on :3001, web on http://localhost:5173
```
Open http://localhost:5173 in two browser windows (or on another computer on your LAN via your machine's IP + :5173) to test.

## Production (one process, one URL)
```bash
npm run build      # builds the frontend into /dist
npm start          # serves /dist and the websocket on $PORT (default 3001)
```
Deploy on any host with a long-running Node process (Render, Railway, Fly.io, a VPS). Not suitable for serverless
platforms (Vercel/Netlify functions), because websockets and in-memory rooms need a persistent server.
Render example: Build `npm install && npm run build`, Start `npm start`.

## Environment variables (all optional)
| Variable | Where | Purpose |
|---|---|---|
| `PORT` | server | Port to listen on (default 3001) |
| `CLIENT_ORIGIN` | server | Comma-separated allowed origins, only if the frontend is on a different domain |
| `VITE_SERVER_URL` | build time | Server URL, only if the frontend is on a different domain |

## How secrecy is enforced
Words live only on the server. For every state update the server builds a per-player view (`viewFor`) that omits the viewer's
own word (the key is absent, not hidden). Chat text is also redacted server-side against the viewer's own word, guesses are
validated on the server, and a word is only revealed to its owner once solved or when the round ends.

## Gameplay (strict turns, enforced by the server)
Each player gets a secret word. Players go in a loop, and every turn has exactly three steps:
1. **Ask** – the active player asks exactly ONE yes/no question.
2. **Answer** – everyone else answers Yes / No / Maybe / I don't know. When all connected players have answered, the game moves on automatically.
3. **Guess** – the active player gets exactly ONE guess. Correct = they win the round (11 − turns taken points, min 1) and all words are revealed. Wrong = the next player's turn starts.

The server rejects extra questions, extra guesses, out-of-turn actions and chat from the active player. Skipping a question or guess is only possible if the host enables it.
The timer (optional) applies per action: running out of time while asking or guessing passes the turn; unanswered questions simply proceed to the guess.
Safety net: a round with no winner after 15 full loops ends with no winner.

## Notes / limits
- Rooms are in memory: restarting the server ends all games. Single server instance only (scale-out would need the Socket.io Redis adapter + shared state).
- Players can't join once a game has started (they can rejoin if they were already in it).
