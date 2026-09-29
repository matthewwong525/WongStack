# Spec Delta

## REMOVED Requirements

### Requirement: Setup records the person's home once per machine

**Reason**: No repo reads or sends memory to another repo, so a recorded home has no use.
**Migration**: Setup stops asking. A `~/.wong-stack/machine.json` left from an earlier setup is ignored and can be deleted.
