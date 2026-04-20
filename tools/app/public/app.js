const state = {
    elements: [],
    selectedId: null,
    originalId: null,
    filter: '',
};

const TYPE_LABELS = {
    user_need: 'UN',
    software_requirement: 'SR',
    feature: 'FEAT',
    verification_test: 'TST',
    other: 'ELM',
};

const dom = {
    tree: document.getElementById('tree'),
    filterInput: document.getElementById('filterInput'),
    editorForm: document.getElementById('editorForm'),
    idInput: document.getElementById('idInput'),
    typeInput: document.getElementById('typeInput'),
    domainInput: document.getElementById('domainInput'),
    statusInput: document.getElementById('statusInput'),
    titleInput: document.getElementById('titleInput'),
    descriptionInput: document.getElementById('descriptionInput'),
    tagsInput: document.getElementById('tagsInput'),
    linkTargetSelect: document.getElementById('linkTargetSelect'),
    addLinkBtn: document.getElementById('addLinkBtn'),
    linksList: document.getElementById('linksList'),
    deleteBtn: document.getElementById('deleteBtn'),
    refreshBtn: document.getElementById('refreshBtn'),
    newBtn: document.getElementById('newBtn'),
    saveStatus: document.getElementById('saveStatus'),
    linkGraph: document.getElementById('linkGraph'),
};

function sanitizeId(value) {
    return String(value || '').trim().replace(/[^A-Za-z0-9_-]/g, '_');
}

async function api(path, options = {}) {
    const response = await fetch(path, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(body.error || `Request failed (${response.status})`);
    }
    return body;
}

function sortById(a, b) {
    return a.id.localeCompare(b.id);
}

function byId(id) {
    return state.elements.find((el) => el.id === id) || null;
}

function selectedElement() {
    return byId(state.selectedId);
}

function setStatus(text, kind = 'info') {
    dom.saveStatus.textContent = text;
    dom.saveStatus.style.color = kind === 'error' ? '#b42318' : kind === 'ok' ? '#166534' : '#6b7280';
}

function updateFormFromSelected() {
    const element = selectedElement();
    const disabled = !element;

    for (const field of [dom.idInput, dom.typeInput, dom.domainInput, dom.statusInput, dom.titleInput, dom.descriptionInput, dom.tagsInput, dom.linkTargetSelect, dom.addLinkBtn, dom.deleteBtn]) {
        field.disabled = disabled;
    }

    if (!element) {
        dom.idInput.value = '';
        dom.typeInput.value = 'other';
        dom.domainInput.value = '';
        dom.statusInput.value = 'draft';
        dom.titleInput.value = '';
        dom.descriptionInput.value = '';
        dom.tagsInput.value = '';
        dom.linksList.innerHTML = '';
        dom.linkGraph.innerHTML = '<div class="node-row"><div class="node-box">No element selected</div></div>';
        return;
    }

    dom.idInput.value = element.id;
    dom.typeInput.value = element.type || 'other';
    dom.domainInput.value = element.domain || '';
    dom.statusInput.value = element.status || 'draft';
    dom.titleInput.value = element.title || '';
    dom.descriptionInput.value = element.description || '';
    dom.tagsInput.value = (element.tags || []).join(', ');

    renderLinksEditor(element);
    renderLinkGraph(element);
}

function filteredElements() {
    const filter = state.filter.trim().toLowerCase();
    if (!filter) return [...state.elements].sort(sortById);
    return state.elements
        .filter((el) => {
            const bag = `${el.id} ${el.title} ${el.description}`.toLowerCase();
            return bag.includes(filter);
        })
        .sort(sortById);
}

function renderTree() {
    const elements = filteredElements();
    const groupedByDomain = new Map();

    for (const el of elements) {
        const domain = (el.domain || 'GEN').toUpperCase();
        if (!groupedByDomain.has(domain)) groupedByDomain.set(domain, []);
        groupedByDomain.get(domain).push(el);
    }

    dom.tree.innerHTML = '';

    const domains = [...groupedByDomain.keys()].sort();
    for (const domain of domains) {
        const domainDetails = document.createElement('details');
        domainDetails.className = 'tree-group';
        domainDetails.open = true;

        const domainSummary = document.createElement('summary');
        domainSummary.textContent = domain;
        domainDetails.appendChild(domainSummary);

        const byType = new Map();
        for (const el of groupedByDomain.get(domain)) {
            const type = el.type || 'other';
            if (!byType.has(type)) byType.set(type, []);
            byType.get(type).push(el);
        }

        const types = [...byType.keys()].sort();
        for (const type of types) {
            const typeDetails = document.createElement('details');
            typeDetails.className = 'tree-subgroup';
            typeDetails.open = true;

            const typeSummary = document.createElement('summary');
            typeSummary.textContent = `${type} (${byType.get(type).length})`;
            typeDetails.appendChild(typeSummary);

            for (const el of byType.get(type).sort(sortById)) {
                const item = document.createElement('div');
                item.className = `tree-item ${state.selectedId === el.id ? 'active' : ''}`;
                item.dataset.id = el.id;

                const badge = document.createElement('span');
                badge.className = `badge ${el.type || 'other'}`;
                badge.textContent = TYPE_LABELS[el.type] || 'ELM';

                const title = document.createElement('span');
                title.className = 'item-title';
                title.textContent = `${el.id} — ${el.title || ''}`;

                item.appendChild(badge);
                item.appendChild(title);

                item.addEventListener('click', () => {
                    state.selectedId = el.id;
                    state.originalId = el.id;
                    render();
                    setStatus('Loaded element');
                });

                typeDetails.appendChild(item);
            }

            domainDetails.appendChild(typeDetails);
        }

        dom.tree.appendChild(domainDetails);
    }
}

function renderLinksEditor(element) {
    const ids = state.elements
        .map((el) => el.id)
        .filter((id) => id !== element.id)
        .sort((a, b) => a.localeCompare(b));

    dom.linkTargetSelect.innerHTML = '';
    for (const id of ids) {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = id;
        dom.linkTargetSelect.appendChild(option);
    }

    dom.linksList.innerHTML = '';
    const links = [...new Set(element.links || [])].sort((a, b) => a.localeCompare(b));

    for (const id of links) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.textContent = id;

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '✕';
        removeBtn.title = `Remove link ${id}`;
        removeBtn.addEventListener('click', () => {
            element.links = (element.links || []).filter((v) => v !== id);
            renderLinksEditor(element);
            renderLinkGraph(element);
            setStatus('Link removed (not saved yet)');
        });

        chip.appendChild(removeBtn);
        dom.linksList.appendChild(chip);
    }
}

function renderLinkGraph(element) {
    const incoming = state.elements
        .filter((el) => el.id !== element.id && (el.links || []).includes(element.id))
        .map((el) => el.id)
        .sort((a, b) => a.localeCompare(b));

    const outgoing = (element.links || [])
        .filter((id) => state.elements.some((el) => el.id === id))
        .sort((a, b) => a.localeCompare(b));

    const makeRow = (items, klass) => {
        const row = document.createElement('div');
        row.className = 'node-row';
        if (items.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'node-box';
            empty.textContent = klass === 'incoming' ? 'No incoming links' : 'No outgoing links';
            row.appendChild(empty);
            return row;
        }

        for (const id of items) {
            const box = document.createElement('button');
            box.type = 'button';
            box.className = `node-box ${klass}`;
            box.textContent = id;
            box.addEventListener('click', () => {
                state.selectedId = id;
                state.originalId = id;
                render();
            });
            row.appendChild(box);
        }
        return row;
    };

    dom.linkGraph.innerHTML = '';
    dom.linkGraph.appendChild(makeRow(incoming, 'incoming'));

    const topConnector = document.createElement('div');
    topConnector.className = 'connector';
    dom.linkGraph.appendChild(topConnector);

    const centerRow = document.createElement('div');
    centerRow.className = 'node-row';
    const selectedBox = document.createElement('div');
    selectedBox.className = 'node-box selected';
    selectedBox.textContent = element.id;
    centerRow.appendChild(selectedBox);
    dom.linkGraph.appendChild(centerRow);

    const bottomConnector = document.createElement('div');
    bottomConnector.className = 'connector';
    dom.linkGraph.appendChild(bottomConnector);

    dom.linkGraph.appendChild(makeRow(outgoing, 'outgoing'));
}

function render() {
    renderTree();
    updateFormFromSelected();
}

async function loadElements() {
    const { elements } = await api('/api/elements');
    state.elements = elements.sort(sortById);

    if (!state.selectedId && state.elements.length > 0) {
        state.selectedId = state.elements[0].id;
        state.originalId = state.selectedId;
    }

    if (state.selectedId && !byId(state.selectedId)) {
        state.selectedId = state.elements[0]?.id || null;
        state.originalId = state.selectedId;
    }

    render();
}

function readForm() {
    const id = sanitizeId(dom.idInput.value);
    const type = dom.typeInput.value;
    const domain = String(dom.domainInput.value || 'GEN').trim().toUpperCase();
    const status = dom.statusInput.value;
    const title = String(dom.titleInput.value || '').trim();
    const description = dom.descriptionInput.value || '';
    const tags = dom.tagsInput.value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);

    const current = selectedElement();
    const links = [...new Set((current?.links || []).map((v) => sanitizeId(v)).filter(Boolean))];

    return {
        id,
        type,
        domain,
        status,
        title,
        description,
        tags,
        links,
        source: current?.source || 'tools/app/manual',
    };
}

async function saveCurrent(event) {
    event.preventDefault();

    try {
        const payload = readForm();
        if (!payload.id) throw new Error('ID is required');

        const originalId = state.originalId || payload.id;
        const idChanged = payload.id !== originalId;

        if (idChanged) {
            await api('/api/elements', { method: 'POST', body: JSON.stringify(payload) });
            await api(`/api/elements/${encodeURIComponent(originalId)}`, { method: 'DELETE' });
            state.selectedId = payload.id;
            state.originalId = payload.id;
        } else {
            await api(`/api/elements/${encodeURIComponent(payload.id)}`, {
                method: 'PUT',
                body: JSON.stringify(payload),
            });
        }

        await loadElements();
        setStatus('Saved', 'ok');
    } catch (error) {
        setStatus(error.message, 'error');
    }
}

async function deleteCurrent() {
    const element = selectedElement();
    if (!element) return;

    const confirmed = window.confirm(`Delete element ${element.id}?`);
    if (!confirmed) return;

    try {
        await api(`/api/elements/${encodeURIComponent(element.id)}`, { method: 'DELETE' });
        state.selectedId = null;
        state.originalId = null;
        await loadElements();
        setStatus(`Deleted ${element.id}`, 'ok');
    } catch (error) {
        setStatus(error.message, 'error');
    }
}

function showCreateModal() {
    const template = document.getElementById('newModalTemplate');
    const fragment = template.content.cloneNode(true);
    const overlay = fragment.querySelector('.modal-overlay');
    const idInput = fragment.getElementById('newIdInput');
    const typeInput = fragment.getElementById('newTypeInput');
    const domainInput = fragment.getElementById('newDomainInput');
    const confirmBtn = fragment.getElementById('createConfirmBtn');
    const cancelBtn = fragment.getElementById('createCancelBtn');

    function close() {
        overlay.remove();
    }

    cancelBtn.addEventListener('click', close);
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close();
    });

    confirmBtn.addEventListener('click', async () => {
        const id = sanitizeId(idInput.value);
        const type = typeInput.value || 'other';
        const domain = String(domainInput.value || 'GEN').trim().toUpperCase();

        if (!id) {
            alert('ID is required');
            return;
        }

        if (state.elements.some((el) => el.id === id)) {
            alert(`Element already exists: ${id}`);
            return;
        }

        try {
            await api('/api/elements', {
                method: 'POST',
                body: JSON.stringify({
                    id,
                    type,
                    domain,
                    title: id,
                    description: '',
                    status: 'draft',
                    tags: [],
                    links: [],
                    source: 'tools/app/manual',
                }),
            });

            state.selectedId = id;
            state.originalId = id;
            await loadElements();
            setStatus(`Created ${id}`, 'ok');
            close();
        } catch (error) {
            alert(error.message);
        }
    });

    document.body.appendChild(overlay);
    idInput.focus();
}

function bindEvents() {
    dom.editorForm.addEventListener('submit', saveCurrent);
    dom.deleteBtn.addEventListener('click', deleteCurrent);
    dom.refreshBtn.addEventListener('click', async () => {
        await loadElements();
        setStatus('Refreshed');
    });
    dom.newBtn.addEventListener('click', showCreateModal);

    dom.filterInput.addEventListener('input', () => {
        state.filter = dom.filterInput.value;
        renderTree();
    });

    dom.addLinkBtn.addEventListener('click', () => {
        const element = selectedElement();
        if (!element) return;
        const target = dom.linkTargetSelect.value;
        if (!target) return;

        if (!element.links) element.links = [];
        if (!element.links.includes(target)) {
            element.links.push(target);
            element.links.sort((a, b) => a.localeCompare(b));
            renderLinksEditor(element);
            renderLinkGraph(element);
            setStatus('Link added (not saved yet)');
        }
    });
}

async function start() {
    bindEvents();

    try {
        await loadElements();
        setStatus(`Loaded ${state.elements.length} elements`, 'ok');
    } catch (error) {
        setStatus(error.message, 'error');
    }
}

start();
