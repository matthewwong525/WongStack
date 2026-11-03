// Tests only: a stand-in for the Python camoufox library, so launch-config.py runs with no download and no browser.
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Writes a fake `camoufox` package under `dir`: `version` is the library's, `pin` the build it pins, and
 * `installed` the build `version.json` names, or null for none. Returns the folder to put on PYTHONPATH. */
export function fakeLibrary(dir, { version = '0.5.9', pin = 'v158.0.1-beta.41', installed = '158.0.1-beta.41', country = 'CA' } = {}) {
  const lib = join(dir, 'lib');
  const pkg = join(lib, 'camoufox');
  mkdirSync(pkg, { recursive: true });
  mkdirSync(join(lib, `camoufox-${version}.dist-info`), { recursive: true });
  mkdirSync(join(lib, 'playwright'), { recursive: true });
  writeFileSync(join(lib, `camoufox-${version}.dist-info`, 'METADATA'), `Metadata-Version: 2.1\nName: camoufox\nVersion: ${version}\n`);
  writeFileSync(join(lib, 'playwright', '__init__.py'), '');
  writeFileSync(join(pkg, '__init__.py'), '');
  const [, pinVersion, pinBuild] = /^v(.*?)-(.*)$/.exec(pin);
  writeFileSync(join(pkg, 'browser_pin.py'), `from types import SimpleNamespace\n\ndef load_pin():\n    return SimpleNamespace(tag=${JSON.stringify(pin)}, version=${JSON.stringify(pinVersion)}, build=${JSON.stringify(pinBuild)})\n`);
  const build = join(dir, 'build');
  mkdirSync(build, { recursive: true });
  if (installed) {
    const [, buildVersion, buildName] = /^(.*?)-(.*)$/.exec(installed);
    writeFileSync(join(build, 'version.json'), JSON.stringify({ version: buildVersion, build: buildName }));
  }
  writeFileSync(join(pkg, 'multiversion.py'), `def get_active_path():\n    return ${installed ? JSON.stringify(build) : 'None'}\n`);
  writeFileSync(join(pkg, 'ip.py'), `def public_ip(proxy=None):\n    if ${country ? 'False' : 'True'}:\n        raise RuntimeError('offline')\n    return '203.0.113.7'\n`);
  writeFileSync(join(pkg, 'geolocation.py'), `from types import SimpleNamespace\n\ndef get_geolocation(ip):\n    return SimpleNamespace(locale=SimpleNamespace(region=${JSON.stringify(country ?? '')}))\n`);
  writeFileSync(join(pkg, 'fingerprints.py'), "import secrets\n\ndef generate_fingerprint(os=None):\n    return {'navigator': {'userAgent': 'Firefox/158.0'}, 'seed': secrets.token_hex(8), 'os': os}\n");
  // The real library prints progress; the fake prints too, to show it stays off stdout.
  writeFileSync(join(pkg, 'utils.py'), [
    'def launch_options(**kwargs):',
    "    print('downloading fonts...')",
    "    return {'executable_path': '/fake/camoufox-bin', 'args': [], 'env': {'CAMOU_CONFIG_1': '{}', 'DISPLAY': kwargs.get('virtual_display') or ''},",
    "            'firefox_user_prefs': {'a.b': True}, 'headless': kwargs['headless'], 'proxy': kwargs['proxy'], 'given': {k: v for k, v in kwargs.items()}}",
    '',
    'def spoofs_window_dimensions(options):',
    '    return False',
    '',
    'def persistent_context_options(options, spoofs):',
    "    return {**options, 'no_viewport': True, 'color_scheme': 'no-override', 'reduced_motion': 'no-override'}",
    '',
  ].join('\n'));
  return lib;
}

/** A venv's `bin/python` under `venv` that runs this computer's python3 on the fake library; `-I` is dropped, since
 * it would ignore PYTHONPATH. */
export function fakeVenv(venv, lib) {
  mkdirSync(join(venv, 'bin'), { recursive: true });
  const python = join(venv, 'bin', 'python');
  writeFileSync(python, `#!/bin/sh\n[ "$1" = "-I" ] && shift\nPYTHONPATH=${JSON.stringify(lib)} exec python3 "$@"\n`);
  chmodSync(python, 0o755);
  return python;
}
