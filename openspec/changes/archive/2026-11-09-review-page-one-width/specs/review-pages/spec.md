## ADDED Requirements

### Requirement: Every part of a review page has one width

On a screen 900 pixels or wider, the title, the why, every card, with or without pictures, what the build needs, the decisions, the notes, and the bottom bar SHALL share one left edge and one right edge, on every review page. A page with no pictures SHALL use the same width as a page with pictures.

#### Scenario: Picture cards and word cards on a computer

- **WHEN** a person opens a review page at 1280 pixels wide whose cards are a card with pictures, a card with only words, and another card with pictures
- **THEN** the why, all three cards, what the build needs, and the decisions start at the same left edge and end at the same right edge

#### Scenario: A page with no pictures

- **WHEN** a person opens, at 1280 pixels wide, a review page with no picture in any card
- **THEN** its cards are as wide as the cards of a page with pictures
