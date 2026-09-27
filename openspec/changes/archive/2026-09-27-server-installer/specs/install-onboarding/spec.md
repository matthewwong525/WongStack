## ADDED Requirements

### Requirement: The server installer installs WongStack unattended

The source SHALL ship a server installer that, run as the workspace user from a clone of the source, installs that clone's WongStack into an empty GitHub repo with no question: the full payload, the install record naming the clone's version and commit, the app's Cloudflare hosting, a memory store served by the production Worker with the person's admin memory key in `.env`, and the CI deploy token as a GitHub secret. It SHALL commit the install on `main` and push it. A second run SHALL finish a first run that stopped, and SHALL leave a repo it already pushed untouched. It SHALL refuse a repo that already holds other work.

#### Scenario: A fresh repo

- **WHEN** a host runs the installer for an empty repo with a valid Cloudflare token and account
- **THEN** the repo's `main` holds the install, its record names the source's version, commit, and memory Worker, and the last output line is `done`

#### Scenario: A repo with other work

- **WHEN** the repo already has commits the installer did not make
- **THEN** it changes nothing and its last output line is `repo`

### Requirement: The server installer keeps the host contract

`server/README.md` SHALL state how a host runs the installer, the job it reads on stdin, the one-word last line it prints for each outcome, and what it never does. The installer SHALL NOT put a token value in a command's arguments, an error, its output, or a committed file, and SHALL NOT write under `/etc/wongstack` or `/opt/wongstack`. The source's tests SHALL install the current payload with it, so a payload file the installer misses fails before release.

#### Scenario: A token in the job

- **WHEN** the installer runs with a Cloudflare token on stdin
- **THEN** no argument list, error, output line, or committed file holds the token or any token it minted

#### Scenario: The payload gains a file

- **WHEN** a change adds a payload file the installer does not install
- **THEN** the source's tests fail and name the file
