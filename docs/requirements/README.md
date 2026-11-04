# IKL requirements workbook - how it is made

`IKL_CRM_Progress_Report_and_Sprint_Plan.xlsx` is the **client-facing** workbook (Summary, Sprint 1 Report, Sprint Plan, Functional Checklist, Roles, Open Questions, Decisions & Services, Beyond BRD). The copy shared with IKL is a Google Drive file (see `CLAUDE.md`, section "Shared files"). This repo copy is the latest local master.

## Rebuilding it

The workbook is generated, not hand-edited:

```bash
mkdir wb && cd wb && npm init -y && npm install exceljs
cp <repo>/docs/requirements/tools/*.js .
# source = the workbook IKL answered (E:\download\IKL CRM Progress Report Answered-1.xlsx); edit SRC at the top if it moved
node build_ikl_workbook.js out.xlsx
node diff_workbooks.js old.xlsx out.xlsx      # compare two workbooks cell by cell
```

- `build_ikl_workbook.js`: sprint plan, function-to-sprint mapping (`SPRINT_FN`), roles matrix, open questions, decisions. **Edit the data here, then rebuild.**
- `sprint1_sheet.js`: the "Sprint 1 Report" sheet and the list of functions turned Done in Sprint 1 (`DONE_NOW`). For a new sprint, add a similar report sheet and extend `DONE_NOW`.

## Publishing to the shared Google Drive file

The shared file is an `.xlsx` stored in Drive (not a native Google Sheet). **Do not edit it inside Google Sheets**: Google warns it will drop conditional formatting (the status colours). Replace the file instead: Drive > right-click the file > File information > Manage versions > Upload new version. The link and sharing stay the same and the old version stays restorable.
