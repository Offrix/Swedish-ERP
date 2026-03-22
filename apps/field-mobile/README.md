# Field Mobile

Thumb-friendly field shell for FAS 10.2 and 10.3.

## Start

```bash
pnpm --filter @swedish-erp/field-mobile start
```

## Notes

- Uses `packages/ui-core` for the HTML shell.
- Uses `packages/ui-mobile` for the field-oriented mobile chrome fragment.
- Shows the required tabs: `Idag`, `Jobb`, `Tid`, `Personalliggare`, `ROT/RUT`, `ATA`, `Material`, `Signatur`, `Profil`.
- Surfaces offline state badges, quick actions, personalliggare entry points and HUS/ATA awareness without moving domain logic into UI.
