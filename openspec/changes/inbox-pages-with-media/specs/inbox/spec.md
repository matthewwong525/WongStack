## ADDED Requirements

### Requirement: A page can be up to 25 MB

The inbox SHALL take a page of up to 25 MB, a review page or a plain page, and keep its HTML outside the item's database row. A page put before this update SHALL still open as before. A page over 25 MB SHALL be refused with a message that names the limit.

#### Scenario: A big report
- **WHEN** a chat puts a 6 MB plain page in Anne's inbox
- **THEN** it shows in her *Artifacts* and opens whole

#### Scenario: An older page
- **WHEN** Anne opens a review page that was put in her inbox before this update
- **THEN** it opens, takes notes and taps as it did before

### Requirement: A page's media shows inside it

A chat SHALL be able to put pictures and videos with any inbox page, up to 300 of them, each up to 95 MB where the install has a file store, and up to the page-file size where it has none. The inbox SHALL hand each one to the page when the page asks for it by name, and a video SHALL play in place. The page SHALL still load nothing from the network itself. Putting the page again with the same id SHALL replace its media.

#### Scenario: Pictures in a review page
- **WHEN** a review page with 40 pictures and 5 videos opens in Bryan's inbox
- **THEN** each picture shows in its place and each video plays, and the page makes no network request of its own

#### Scenario: A name the page did not carry
- **WHEN** a page asks for a media name it was not put with
- **THEN** the inbox gives it nothing, and the page can show that the picture is missing
