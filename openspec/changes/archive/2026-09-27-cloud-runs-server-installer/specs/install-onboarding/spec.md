## MODIFIED Requirements

### Requirement: The server installer keeps the host contract

`server/README.md` SHALL state how a host runs the installer, the job it reads on stdin, the one-word last line it prints for each outcome, the refused-call line before it, the names a host may import from it, and what it never does. When a refused Cloudflare call stops the install, the installer SHALL print that call as `Cloudflare <METHOD> <path>: HTTP <status> <codes>` on the line before the reason, only when the line matches the `CLOUDFLARE_CALL` pattern it exports. The installer SHALL NOT put a token value in a command's arguments, an error, its output, or a committed file, and SHALL NOT write under `/etc/wongstack` or `/opt/wongstack`. The source's tests SHALL install the current payload with it, so a payload file the installer misses fails before release.

#### Scenario: A token in the job

- **WHEN** the installer runs with a Cloudflare token on stdin
- **THEN** no argument list, error, output line, or committed file holds the token or any token it minted

#### Scenario: The payload gains a file

- **WHEN** a change adds a payload file the installer does not install
- **THEN** the source's tests fail and name the file

#### Scenario: Cloudflare refuses a call

- **WHEN** Cloudflare refuses a call and the install stops
- **THEN** the second-last line names the method, the path without its query, the status, and the error codes, and the last line is the reason word
