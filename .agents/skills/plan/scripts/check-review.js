// Evaluate in the opened review page. Returns named structural diagnostics.
(() => {
  const issues = [];
  const fail = (code, target) => issues.push({ code, target });
  const ids = new Set();
  for (const element of document.querySelectorAll('[id]')) {
    if (ids.has(element.id)) fail('duplicate-id', element.id);
    ids.add(element.id);
  }
  const visuals = [...document.querySelectorAll('section.visual')].filter(v => !v.id.startsWith('_'));
  const byId = new Map(visuals.map(v => [v.id, v]));
  const used = new Set();
  const usedMarks = new Set();
  for (const item of document.querySelectorAll('#panel ol.changes li')) {
    const label = item.textContent.trim().slice(0, 90);
    if (item.classList.contains('dead')) fail('dead-anchor', label);
    const anchor = item.querySelector('.kind')?.textContent.match(/#\/([\w-]+)(?:\/([\w-]+))?(?:\/([\w-]+))?/);
    if (!anchor) continue;
    const [, id, first, third] = anchor;
    const visual = byId.get(id);
    if (!visual) { fail('missing-visual', id); continue; }
    if (used.has(id)) fail('shared-visual', id);
    used.add(id);
    const states = (visual.dataset.states || 'default').split(/\s+/).filter(Boolean);
    if (third && !states.includes(first)) fail('invalid-state', `${id}/${first}`);
    const mark = third || (first && !states.includes(first) ? first : null);
    if (mark) {
      usedMarks.add(`${id}/${mark}`);
      if (![...visual.querySelectorAll('[data-mark]')].some(el => el.dataset.mark === mark)) fail('missing-mark', `${id}/${mark}`);
    }
  }
  for (const visual of visuals) {
    if (!used.has(visual.id)) fail('unreferenced-visual', visual.id);
    const states = (visual.dataset.states || 'default').split(/\s+/).filter(Boolean);
    if (!states.length || new Set(states).size !== states.length) fail('invalid-states', visual.id);
    for (const element of visual.querySelectorAll('[data-mark]')) {
      const mark = element.dataset.mark;
      if (states.includes(mark)) fail('state-mark-collision', `${visual.id}/${mark}`);
      if (!usedMarks.has(`${visual.id}/${mark}`)) fail('unreferenced-mark', `${visual.id}/${mark}`);
    }
    for (const go of visual.querySelectorAll('[data-go]')) fail('cross-item-navigation', `${visual.id}/${go.dataset.go}`);
    for (const control of visual.querySelectorAll('[data-local-state]')) {
      if (!states.includes(control.dataset.localState)) fail('missing-local-state', `${visual.id}/${control.dataset.localState}`);
    }
    if (visual.dataset.kind === 'screen') {
      const actions = [...visual.querySelectorAll('.btn.primary')];
      for (const state of states) {
        const block = visual.querySelector(`.state.state-${state}`);
        if (!block || (!block.textContent.trim() && !block.children.length)) fail('empty-screen-state', `${visual.id}/${state}`);
        const visible = actions.filter(action => {
          const parent = action.closest('.state');
          return !parent || parent.classList.contains(`state-${state}`);
        });
        if (visible.length > 1) fail('multiple-primary-actions', `${visual.id}/${state}`);
      }
    }
    if (visual.dataset.kind === 'flow' && states.includes('today') && !visual.querySelector('.lane.today,.state-today')) {
      fail('missing-today-lane', visual.id);
    }
  }
  return JSON.stringify({ ok: issues.length === 0, issues });
})()
