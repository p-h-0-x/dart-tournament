# Game Modes

The app supports 4 dart game modes. Each can be played as a standalone game or within a tournament.

---

## Classic Halve-It

**Mode ID:** `classic`

A 15-round game where all players throw at the same fixed sequence of contracts. Each round has a specific target — hit it to score points, miss it and your score is halved.

### How It Works

1. All players start with 0 points
2. Each round has a **contract** (target) that players must hit with their 3 darts
3. If you **hit** the contract: add the qualifying dart scores to your total
4. If you **miss** the contract: your total score is **halved** (rounded down)
5. After all 15 rounds, the player with the highest score wins

### The 15 Contracts (in order)

1. **Capital** — Any throw counts. Sum of all 3 darts. Cannot miss.
2. **20** — Hit the 20 segment (single, double, or triple)
3. **Side** — Land 3 darts on physically adjacent segments on the board
4. **19** — Hit the 19 segment
5. **3 in a Row** — Hit 3 numerically consecutive numbers (e.g., 5, 6, 7)
6. **18** — Hit the 18 segment
7. **Color** — Hit 3 different colors (black, white, red, green)
8. **17** — Hit the 17 segment
9. **Double** — Hit any double ring (or double bull)
10. **16** — Hit the 16 segment
11. **Triple** — Hit any triple ring
12. **15** — Hit the 15 segment
13. **57** — Score exactly 57 points total with 3 darts
14. **14** — Hit the 14 segment
15. **Bull** — Hit the bull (single 25 or double 50)

See [Game Engines](GAME_ENGINES.md#the-15-contracts) for detailed scoring rules per contract.

---

## Clock

**Mode ID:** `clock`

A race to hit every number in sequence. First player to complete the sequence wins.

### How It Works

1. Players take turns throwing 3 darts per turn
2. Targets progress in order: **1, 2, 3, 4, 5, 6, 7, 8, 9, 10, Bull**
3. You must hit your current target to advance to the next one
4. Doubles and triples of the target number count (and may advance you through multiple targets)
5. The first player to hit Bull after completing 1–10 wins

---

## Killer

**Mode ID:** `killer`

An elimination-style game where each player has a personal target number.

### How It Works

1. Each player is assigned (or throws for) a personal target number
2. Players take turns throwing at **other players' numbers** to reduce their lives
3. Each player starts with a set number of lives
4. When a player's lives reach zero, they are eliminated
5. Last player standing wins

---

## 301/501

**Mode ID:** `301/501`

A classic point-based countdown game.

### How It Works

1. Each player starts with 301 (or 501) points
2. Players take turns throwing 3 darts, subtracting their score from the remaining total
3. You must reach **exactly 0** to win
4. If a throw would take you below 0, that turn's score doesn't count (bust)
5. Some variants require a double to finish (double-out)
