# Cupcake Activities: drakram-day13 (Ported to SLC Catalog)

This folder contains ported JSON definitions for the 15 activities from the Cupcake collection [drakram-day13](https://adapt2.sis.pitt.edu/cupcake/#/activities/drakram-day13), ready for ingestion into the SLC Catalog V2.

## Activity Breakdown

| # | Catalog ID | File | Title | SLC Catalog Type | Authors / Affiliation |
|---|---|---|---|---|---|
| 1 | `6acc54b60e3927e0428ff39b` | `Q1.json` | Build and Shift an Array of Points | `FreeCodingProblems` | Bita Akram (NC State University) |
| 2 | `6acc54b60e3927e0428ff39d` | `Q2.json` | Build an Array of Points | `FreeCodingProblems` | Bita Akram (NC State University) |
| 3 | `6acc54b60e3927e0428ff39f` | `Q3.json` | Find a Book by Title | `FreeCodingProblems` | Bita Akram (NC State University) |
| 4 | `6acc54b60e3927e0428ff3a1` | `Q4.json` | Make a Sale Price List | `FreeCodingProblems` | Bita Akram (NC State University) |
| 5 | `6acc54b60e3927e0428ff3a3` | `Q5.json` | Park a Car | `FreeCodingProblems` | Bita Akram (NC State University) |
| 6 | `6acc54b60e3927e0428ff3a5` | `01-playlist-worked-example.json` | Music Playlist: Null Array Elements | `CodeConstruction` | Aum Pandya (North Carolina State University) |
| 7 | `6acc54b60e3927e0428ff3a7` | `02-museum-worked-example.json` | Museum Labels: Check for Null | `CodeConstruction` | Aum Pandya (North Carolina State University) |
| 8 | `6acc54b60e3927e0428ff3a9` | `03-weather-worked-example.json` | Weather Stations: Two-Phase Initialization | `CodeConstruction` | Aum Pandya (North Carolina State University) |
| 9 | `6acc54b60e3927e0428ff3ab` | `04-game-worked-example.json` | Game Tokens: Sharing an Object | `CodeConstruction` | Aum Pandya (North Carolina State University) |
| 10 | `6acc54b60e3927e0428ff3ad` | `05-parking-lot-code-completion.json` | Complete the Two-Phase Initialization of a Parking Lot | `CodeCompletionProblem` | Aum Pandya (North Carolina State University) |
| 11 | `6acc54b70e3927e0428ff3af` | `06-cargo-hold-code-completion.json` | Build a Null-Safe Guard for a Cargo Hold | `CodeCompletionProblem` | Aum Pandya (North Carolina State University) |
| 12 | `6acc54b70e3927e0428ff3b1` | `07-top-scorer-code-completion.json` | Find the Top Scorer, or Return null | `CodeCompletionProblem` | Aum Pandya (North Carolina State University) |
| 13 | `6acc54b70e3927e0428ff3b3` | `08-seat-map-code-tracing.json` | Trace a Partly Booked Seat Map | `PredictingFinalResult` | Aum Pandya (North Carolina State University) |
| 14 | `6acc54b70e3927e0428ff3b5` | `09-initials-code-tracing.json` | Trace Initials Built from a Sparse String Array | `PredictingFinalResult` | Aum Pandya (North Carolina State University) |
| 15 | `6acc54b70e3927e0428ff3b7` | `10-click-counters-code-tracing.json` | Trace Shared vs. Separate Counter Objects | `PredictingFinalResult` | Aum Pandya (North Carolina State University) |

## Delivery URLs
Each activity item includes dual delivery protocols:
1. **HTML**: `https://adapt2.sis.pitt.edu/cupcake/#/activities/drakram-day13/{path}`
2. **SPLICE**: `https://adapt2.sis.pitt.edu/cupcake/#/activities/drakram-day13/{path}?protocol=splice`

## Regeneration Script
The script `port.py` fetches the live activities and companion Java files from Cupcake and regenerates the JSON specifications.
