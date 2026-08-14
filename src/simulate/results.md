# Simulation results

More for testing than anything else.

## Rough results

Standard

```
{
  random: { played: 108, leaguePoints: -160, totalScore: 177920 },
  ismcts10: { played: 108, leaguePoints: -140, totalScore: 181540 },
  ismcts100: { played: 108, leaguePoints: 340, totalScore: 203580 }
}
```

```
{
  random: { played: 32, leaguePoints: -120, totalScore: 47420 },
  ismcts1000: { played: 32, leaguePoints: 120, totalScore: 63300 }
}
```

## Further (v2)

```json
{
  trickplay: 'allfours',
  gamemode: 'embers',
  packs: 2,
  sitout: 0,
  numHands: 4,
};
```

```
{
  random: { played: 32, leaguePoints: -120, totalScore: 92840 },
  ismcts1000: { played: 32, leaguePoints: 120, totalScore: 138120 }
}
```

```json
{
  trickplay: 'allfours',
  gamemode: 'embers',
  packs: 3,
  sitout: 1,
  numHands: 4,
};
```

```
{
  random: { played: 32, leaguePoints: -40, totalScore: 112020 },
  ismcts1000: { played: 32, leaguePoints: 40, totalScore: 125180 }
}
```

```json
{
  trickplay: 'allfours',
  gamemode: 'classic',
}
```

```
{
  random: { played: 64, leaguePoints: -240, totalScore: 168920 },
  ismcts1000: { played: 64, leaguePoints: 240, totalScore: 231240 }
}
```

```json
{
  trickplay: 'standard',
  gamemode: 'classic',
}
```

```
{
  random: { played: 64, leaguePoints: -200, totalScore: 199740 },
  ismcts1000: { played: 64, leaguePoints: 200, totalScore: 240820 }
}
```