# Dart Tournament

**[Play Now](https://p-h-0-x.github.io/dart-tournament/)**

Organize dart tournaments, play live interactive games, track scores, and crown champions -- all from your phone or browser.

## Game Modes

### Classic Halve-It (The Bounty)

A 15-round game where players throw 3 darts per round at specific contracts. Hit the contract to add your score to your capital. Miss it and your capital gets halved.

**Contracts in order:**
| # | Contract | Rule |
|---|----------|------|
| 1 | Capital | Starting score -- sum of all 3 darts |
| 2 | 20 | At least one dart hits 20 |
| 3 | Side | 3 darts on adjacent board segments |
| 4 | 19 | At least one dart hits 19 |
| 5 | 3 in a Row | 3 consecutive numbers (e.g., 14-15-16) |
| 6 | 18 | At least one dart hits 18 |
| 7 | Color | 3 different colors (black, white, red, green) |
| 8 | 17 | At least one dart hits 17 |
| 9 | Double | At least one double |
| 10 | 16 | At least one dart hits 16 |
| 11 | Triple | At least one triple |
| 12 | 15 | At least one dart hits 15 |
| 13 | 57 | All 3 darts total exactly 57 |
| 14 | 14 | At least one dart hits 14 |
| 15 | Bull | At least one bullseye (single or double) |

Winner: highest capital after all 15 rounds.

#### Checkpoint Society Mode

An optional bonus mode inspired by The Checkpoint Society's "The Bounty" board. Each contract has a bonus reward that triggers under specific conditions:

| Contract | Bonus | Condition |
|----------|-------|-----------|
| 20 | 1 Roll for a shot | All 3 darts on 20 |
| Side | 1 free shot | Contract hit |
| 19 | +1 Bonus Dart | All 3 darts on 19 |
| 3 in a Row | X2 Score | Contract hit |
| 18 | 2 Rolls for a shot | All 3 darts on 18 |
| Color | 1 free galopin | Contract hit |
| 17 | +1 Joker Retry | All 3 darts on 17 |
| Double | +3 Free Darts | All 3 darts are doubles |
| 16 | 1 free Demi | All 3 darts on 16 |
| Triple | 1 free Pinte | All 3 darts are triples |
| 15 | +1 Bonus Dart | All 3 darts on 15 |
| 57 | 1 free Cocktail | First dart is T19 (57 in one shot) |
| 14 | X2 Score | All 3 darts on 14 |
| Bull | 30 Casino Coins + 2 Cocktails | Contract hit |

In-game bonuses (X2 Score, Bonus Darts) are applied automatically. Drink rewards show as a popup notification.

### Clock

A racing game through targets 1 to 10, then Bull to finish.

- Each turn: throw 3 darts at your current target number
- Hit the target to advance. Doubles advance 2 positions, triples advance 3
- Position caps at Bull (never skips it)
- If your last dart of the turn hits the target: you get an extra turn
- First player to hit Bull wins immediately
- If nobody finishes after 10 turns each: highest position wins

### Killer

An elimination game with personal target numbers.

1. **Number selection**: each player picks a unique number (1-20)
2. **Play phase**: throw 3 darts per turn
   - Hit your own number: +3 lives per multiplier
   - Hit adjacent numbers: +1 life per multiplier
   - At 9 lives: you become a **Killer** and can attack others
   - Killers damage other players by hitting their numbers/adjacents
   - Eliminated at -1 life
3. Last player standing wins

## Tournament Features

- **Flexible brackets**: manually create matches with any number of players per match
- **Round management**: add matches to rounds, advance to next round when ready
- **Launch Game**: start a live interactive game directly from a tournament match
- **Auto-fill winner**: when a game ends, the winner auto-fills in the bracket
- **Tie resolution**: admin picks the advancing player when games end in a tie
- **Player pool**: add or remove players mid-tournament, bring back eliminated players for losers brackets

## Live Games

When a game is launched from a tournament:
- **Admin** controls the game at `/admin/games/:id` -- enters darts, advances rounds
- **Spectators** watch in real-time at `/games/:id` with a live badge and auto-updating scores
- Game state is saved server-side -- admin can navigate away and come back without losing progress
- Full undo support for all game modes
- Turn history log available for reviewing every dart thrown

## Other Features

- **Leaderboard**: overall player rankings with wins, losses, win rate, and tournaments won
- **High Scores**: personal bests and all-time records for Classic Halve-It (separate categories for Classic and Checkpoint Society)
- **Player Profiles**: individual stats, head-to-head records, and game history
- **Games History**: all games across all modes with tournament context and links to view details
- **Light/Dark Mode**: toggle between themes (preference saved locally)
- **Mobile friendly**: responsive design with bottom navigation bar
- **Real-time sync**: all data updates live across all connected devices

## For Organizers

The admin interface (protected by login) lets you:
- Create and manage tournaments
- Create players inline while setting up a tournament
- Launch and control live games
- Score games manually (for modes without the game engine)
- View and manage all players
- Reset all data if needed

## Technical Documentation

For developers and contributors, see [CONTRIBUTING.md](CONTRIBUTING.md).
