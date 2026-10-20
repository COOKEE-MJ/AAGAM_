# AAGAM Computer Vision Damage Triage (`vision/`)

This directory houses the computer vision damage triage model and inference contracts for the AAGAM emergency disaster intelligence system.

## Supported Damage Classes
| Category | Model Labels Detected | Auto-Verify Threshold |
| :--- | :--- | :---: |
| **Flooding** | `flood`, `waterlogging`, `submerged` | $\ge 0.70$ |
| **Building Damage** | `building_damage`, `collapsed_building`, `structural_crack` | $\ge 0.70$ |
| **Road Blocked** | `road_blocked`, `landslide`, `debris`, `fallen_tree` | $\ge 0.70$ |
| **Landslide** | `landslide`, `mudslide`, `rockfall`, `debris` | $\ge 0.70$ |
| **Fire** | `fire`, `smoke`, `wildfire` | $\ge 0.70$ |

## Safety & Governance
- **Human-in-the-Loop:** Triage scores below $0.70$ are routed to the DDMA Authority Review Queue (`needs_review`). Officers make the final decision to approve or reject.
- **Fail-Safe:** If the vision model is unreachable or offline, report submission is **never** blocked. The report automatically routes to `needs_review`.
- **Payload Limits:** Maximum image size is 1.5MB; client PWAs compress images locally to ~300 KB before transmission.

## Running Tests
```bash
python -m unittest vision/test_triage.py
```

