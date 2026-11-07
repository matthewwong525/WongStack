"""Prints the shared browser's launch config from the official camoufox library, as one JSON line.

usage: launch-config.py --library <version> --build <tag> [--check] [--proxy <url>] [--display <:n> | --window]
                        [--fingerprint <file>] [--addon <folder>]...

--check only compares the pins with what is installed. A refusal prints {"error", "needs"} and exits 3;
"needs" names the part to install again: python, library, build, or pins (the two pins disagree).
--fingerprint keeps the browser's identity in <file> (mode 600), made once per library, build, and system, so
each start shows sites the same device. --window shows the browser on the computer's own screen, as off Linux.
--addon, once per add-on, loads an add-on the person chose from its unzipped folder, keeps its
storage from start to start, and lets it open its own tabs.
browser-server.mjs runs it at each start; browse.mjs status runs --check.
"""

import argparse
import contextlib
import json
import os
import sys
from importlib import metadata


# The computer's own system, which the browser tells sites: on a Mac, another system's
# bundled fonts cover the Mac's and scramble the browser's own pages, such as about:addons.
HOST_OS = {'darwin': 'macos', 'win32': 'windows'}.get(sys.platform, 'linux')


class Refusal(Exception):
    def __init__(self, reason, needs):
        super().__init__(reason)
        self.needs = needs


def installed_build():
    """The pinned build's `<version>-<build>`, or None when the library finds it not installed."""
    from camoufox.multiversion import get_active_path

    active = get_active_path()
    if active is None:
        return None
    with open(os.path.join(active, 'version.json'), encoding='utf-8') as file:
        data = json.load(file)
    return f"{data.get('version')}-{data.get('release') or data.get('build') or data.get('tag')}"


def check(library, build):
    """The installed `{library, build}`, once both match the pins; else a Refusal naming what to install."""
    try:
        have = metadata.version('camoufox')
    except metadata.PackageNotFoundError:
        raise Refusal('the camoufox library is not installed', 'library')
    if have != library:
        raise Refusal(f'the camoufox library is {have}, not {library}', 'library')
    from camoufox.browser_pin import load_pin

    pin = load_pin()
    if pin is None or pin.tag != build:
        raise Refusal(f'camoufox {library} pins {pin.tag if pin else "no build"}, not {build}; raise both pins together', 'pins')
    spec = f'{pin.version}-{pin.build}'
    found = installed_build()
    if found != spec:
        raise Refusal(f'the camoufox build {spec} is not installed' + (f' ({found} is)' if found else ''), 'build')
    return {'library': have, 'build': spec}


def country_of(proxy):
    """The proxy's exit address and its country, or (None, None) when the lookup fails."""
    from camoufox.geolocation import get_geolocation
    from camoufox.ip import public_ip

    try:
        address = public_ip(proxy) if proxy else public_ip()
        return address, get_geolocation(address).locale.region
    except Exception:  # noqa: BLE001 -- a failed lookup starts the browser in US English, as camofox did
        return None, None


def saved_fingerprint(path, versions):
    """The identity saved in `path` for these versions and this system, else a new one saved there; and whether it
    was saved. A file with no `os` was made as Linux."""
    try:
        with open(path, encoding='utf-8') as file:
            saved = json.load(file)
        if saved.get('versions') == versions and saved.get('os', 'linux') == HOST_OS and isinstance(saved.get('fingerprint'), dict):
            return saved['fingerprint'], True
    except (OSError, ValueError, AttributeError):
        pass
    from camoufox.fingerprints import generate_fingerprint

    fingerprint = generate_fingerprint(os=HOST_OS)
    temp = f'{path}.tmp'
    with open(os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), 'w', encoding='utf-8') as file:
        json.dump({'versions': versions, 'os': HOST_OS, 'fingerprint': fingerprint}, file, default=str)
    os.chmod(temp, 0o600)
    os.replace(temp, path)
    return fingerprint, False


# Camoufox loads an add-on folder as a temporary add-on, which loses its address and its storage at each shutdown
# without these two.
KEEP_ADDON_PREFS = {
    'extensions.webextensions.keepStorageOnUninstall': True,
    'extensions.webextensions.keepUuidOnUninstall': True,
}


def addon_options(addons):
    """The launch options that load each add-on folder, or none."""
    if not addons:
        return {}
    return {'addons': list(addons), 'allow_addon_new_tab': True, 'firefox_user_prefs': dict(KEEP_ADDON_PREFS)}


def launch(proxy, display, fingerprint=None, window=False, addons=None):
    """The persistent-context options for this start, English for the country the proxy's address is in."""
    from camoufox.utils import launch_options, persistent_context_options, spoofs_window_dimensions

    address, country = country_of(proxy)
    locale = f'en-{country}' if country else 'en-US'
    options = launch_options(
        os=HOST_OS,
        headless=not (display or window),
        virtual_display=display or None,
        humanize=True,
        enable_cache=True,
        geoip=address or None,
        locale=locale,
        proxy={'server': proxy} if proxy else None,
        fingerprint=fingerprint,
        **addon_options(addons),
    )
    return {'options': persistent_context_options(options, spoofs_window_dimensions(options)), 'locale': locale}


def driver_dir():
    """The Node package of the Playwright driver the Python library runs, so the protocol matches the build."""
    import playwright

    return os.path.join(os.path.dirname(playwright.__file__), 'driver', 'package')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--library', required=True)
    parser.add_argument('--build', required=True)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--proxy')
    parser.add_argument('--display')
    parser.add_argument('--window', action='store_true')
    parser.add_argument('--fingerprint')
    parser.add_argument('--addon', action='append')
    args = parser.parse_args()
    out = sys.stdout
    try:
        # The library prints progress and warnings; only the JSON line goes to stdout.
        with contextlib.redirect_stdout(sys.stderr):
            result = check(args.library, args.build)
            if not args.check:
                fingerprint, saved = saved_fingerprint(args.fingerprint, result) if args.fingerprint else (None, None)
                result |= launch(args.proxy, args.display, fingerprint, args.window, args.addon) | {'driver': driver_dir()}
                if args.fingerprint:
                    result['fingerprint'] = 'saved' if saved else 'new'
    except Refusal as refusal:
        out.write(json.dumps({'error': str(refusal), 'needs': refusal.needs}) + '\n')
        return 3
    except ImportError as error:
        out.write(json.dumps({'error': f'the camoufox library does not load: {error}', 'needs': 'library'}) + '\n')
        return 3
    except Exception as error:  # noqa: BLE001 -- the server shows the reason; the traceback is on stderr
        out.write(json.dumps({'error': f'the launch config failed: {error}', 'needs': None}) + '\n')
        return 1
    out.write(json.dumps(result, default=str) + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
