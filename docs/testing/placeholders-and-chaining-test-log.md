# Placeholders, Flow/Apex values, chaining, template lifecycle: test log

Dev scratch org `dxtemplates-scratch-30d`. Seeds: `docs/tools/org-seed/seed_placeholders.apex`, `docs/tools/org-seed/zzpack/` (class, chain handler, flow, handler metadata).

## Fixed and verified (Apex tests + real PDF)
- `##Section##` embeds a Table section of the same template (inline or replacing a lone paragraph); `%%Token%%`, `%%Path.To%%`, `%%List.Field%%` in table rows; Apex class and Flow values; safe text for `&` `<`; `$` kept.
- Chained run (Flow action -> Queueable `sendEmailAutomation` -> attachment -> handler class from `DXTemplates_HandlerClass`): works; server-side path now applies translations, visibility rules, class/flow values.
- Default page properties fallback, orientation/size normalised, activation/delete/clone lifecycle.

## Edit Template dialog: class/flow wiped (fixed 2026-11-01)
- Symptom: saving a description-only edit cleared `ClassId__c` / `FlowId__c`.
- Cause: `editTemp` (choice sent to `updateTemplateDetails`) was never reset, so a class/flow choice (or an empty selection event) from an earlier visit of the dialog was sent again.
- Fix: `handleEditTemplate` starts with `this.editTemp = {}`. Jest: templateDesignerCMP.test.js "sends no class or flow change...". Browser: description edit kept ClassId (SOQL).

## Open / for follow-up
- Server-side generation for several records (class/flow/translations/visibility only for one record); Flow action handles one record at a time.
- `DXTemplates_HandlerClass` record is not shipped by the package.
- Re-run all of this in a non-namespaced org with the 2GP package (convert seeds to `DxCPQ__` names, install zzpack, check Flow dropdown lists only unnamespaced flows).

## Designer lifecycle in the browser (2026-11-01, "ZZ Probe2", own throwaway)
- Activate: toolbar label flips to Deactivate, section editors grey out; SOQL IsActive=true, Previously_Active=true. OK.
- Deactivate: label flips back to Activate, IsActive=false; OK.
- Delete: confirm dialog, toast "Template Deleted Successfully", list refreshes and selects the first template; template gone. OK.
- UI observations (for the UI discussion): after Deactivate the section editors stay greyed out (Previously_Active locks editing by design, but nothing on screen says why); Edit Properties stays clickable while active; section Save/Delete buttons look enabled while the fields are locked.
