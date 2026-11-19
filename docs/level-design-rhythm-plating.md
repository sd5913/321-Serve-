# Level Design — Rhythm Plating

> A rhythm-based level for *321 Serve*. Players tap in rhythm to help the big chopsticks plate fish pieces in the correct order.

---

## 1. Core Concept

At the **top-left of the screen**, the level shows the complete plated dishes to be assembled in this stage — **five plates of fish pieces arranged in different orders**.

Each plate is a sequence of salmon and squid pieces. For example:

> **3 salmon pieces → 2 squid pieces → 4 salmon pieces**
> corresponds to the tap pattern: **L L L · R R · L L L L**
> (Salmon = tap Left, Squid = tap Right)

**Key rule:** the spacing between fish pieces determines the tapping speed — the closer the pieces are drawn to each other, the faster the required rhythm.

---

## 2. Gameplay Loop

| Step | Description |
| --- | --- |
| 1 | Salmon and squid pieces run **left to right** across the cutting board. |
| 2 | The **big chopsticks**, held by a pair of hands on the far right, pick up the passing pieces. |
| 3 | Each ingredient represents one strike type: **Salmon = strike the left side of the plate**, **Squid = strike the right side of the plate**. |
| 4 | At the **bottom center** sits a **semicircular plate**. If the player taps in the correct rhythm, the chopsticks fling the fish into the plate, where it spins into place on the dish. |
| 5 | If the rhythm is wrong, the chopsticks pick the fish up and **fling it away** (miss). |
| 6 | After **five full plates** are assembled, the player advances to the **next level**. |

---

## 3. Required Art Assets

All assets must share the **same perspective angle**:

| # | Asset | Notes |
| --- | --- | --- |
| 1 | Solid-color level background board | Clean backdrop for the whole stage |
| 2 | Cutting board | Surface where fish pieces run left to right |
| 3 | Small salmon piece | Two expressions: **happy** / **terrified** |
| 4 | Small squid piece | Two expressions: **happy** / **terrified** |
| 5 | Hands holding big chopsticks — **picking** pose | For grabbing fish pieces |
| 6 | Hands holding big chopsticks — **flinging** pose | For tossing fish into the plate / off-screen |
| 7 | Semicircular plate — **top view** | Left and right sides color-coded to mark the strike zones for different ingredients |
| 8 | Round plate — **top view** | Used for the plated dish display |
| 9 | Salmon slice — **no expression** | For final plating arrangement |
| 10 | Squid slice — **no expression** | For final plating arrangement |

---

## 4. Design Notes

- The **semicircular plate** doubles as the input UI: its color-coded left/right halves visually map to the two tap types (salmon / squid).
- Piece **expressions** (happy / terrified) give instant feedback — happy when on rhythm, terrified when a miss is about to happen.
- The **round plate** view showcases the completed dish, reinforcing the "five plates per level" goal.
