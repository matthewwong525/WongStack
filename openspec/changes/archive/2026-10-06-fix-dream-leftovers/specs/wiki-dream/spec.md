# Spec Delta

## ADDED Requirements

### Requirement: A dream can run again the same day

A second dream on a day that already had one SHALL run and publish like the first, with no step left for the person to fix by hand.

#### Scenario: Two dreams in one day

- **WHEN** a person runs `/dream-memory` twice on the same day and each has an edit to publish
- **THEN** both publish, each as its own change
