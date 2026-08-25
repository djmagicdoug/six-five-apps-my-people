// My People — API
// Cloudflare Pages Function, catches every request under /api/*.
// Talks to the D1 database bound as "DB" (set up in the Pages project settings).

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json" }
  });
}

function newId() {
  return crypto.randomUUID();
}

// ---------- row <-> API object mapping ----------

function mapContact(row) {
  var services = [];
  try { services = JSON.parse(row.services || "[]"); } catch (e) { services = []; }
  return {
    id: row.id,
    name: row.name,
    company: row.company || "",
    email: row.email || "",
    phone: row.phone || "",
    address: row.address || "",
    isClient: !!row.is_client,
    services: services,
    archived: !!row.archived,
    createdAt: row.created_at
  };
}
function mapProject(row) {
  return {
    id: row.id,
    name: row.name,
    area: row.area || "",
    target: row.target === null || row.target === undefined ? null : row.target,
    archived: !!row.archived,
    createdAt: row.created_at
  };
}
function mapTodo(row) {
  return {
    id: row.id,
    text: row.text,
    due: row.due || "",
    done: !!row.done,
    clientId: row.contact_id || null,
    projectId: row.project_id || null,
    createdAt: row.created_at
  };
}
function mapNote(row) {
  return {
    id: row.id,
    text: row.text,
    date: row.date,
    clientId: row.contact_id || null,
    projectId: row.project_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || null
  };
}
function mapEvent(row) {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    time: row.time || "",
    clientId: row.contact_id || null,
    projectId: row.project_id || null,
    createdAt: row.created_at
  };
}

// ---------- contacts ----------

async function contactsList(db) {
  var res = await db.prepare("SELECT * FROM contacts WHERE archived = 0 ORDER BY name COLLATE NOCASE").all();
  return json(res.results.map(mapContact));
}
async function contactsCreate(db, body) {
  var id = newId();
  var now = Date.now();
  await db.prepare(
    "INSERT INTO contacts (id, name, company, email, phone, address, is_client, services, archived, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)"
  ).bind(
    id, body.name || "", body.company || "", body.email || "", body.phone || "", body.address || "",
    body.isClient ? 1 : 0, JSON.stringify(body.services || []), now
  ).run();
  var row = await db.prepare("SELECT * FROM contacts WHERE id = ?").bind(id).first();
  return json(mapContact(row), 201);
}
async function contactsUpdate(db, id, body) {
  await db.prepare(
    "UPDATE contacts SET name = ?, company = ?, email = ?, phone = ?, address = ?, is_client = ?, services = ? WHERE id = ?"
  ).bind(
    body.name || "", body.company || "", body.email || "", body.phone || "", body.address || "",
    body.isClient ? 1 : 0, JSON.stringify(body.services || []), id
  ).run();
  var row = await db.prepare("SELECT * FROM contacts WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "Not found" }, 404);
  return json(mapContact(row));
}
async function contactsDelete(db, id) {
  await db.prepare("UPDATE todos SET contact_id = NULL WHERE contact_id = ?").bind(id).run();
  await db.prepare("UPDATE notes SET contact_id = NULL WHERE contact_id = ?").bind(id).run();
  await db.prepare("UPDATE events SET contact_id = NULL WHERE contact_id = ?").bind(id).run();
  await db.prepare("DELETE FROM contacts WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

// ---------- projects ----------

async function projectsList(db) {
  var res = await db.prepare("SELECT * FROM projects WHERE archived = 0 ORDER BY name COLLATE NOCASE").all();
  return json(res.results.map(mapProject));
}
async function projectsCreate(db, body) {
  var id = newId();
  var now = Date.now();
  var target = body.target === "" || body.target === null || body.target === undefined ? null : Number(body.target);
  await db.prepare(
    "INSERT INTO projects (id, name, area, target, archived, created_at) VALUES (?, ?, ?, ?, 0, ?)"
  ).bind(id, body.name || "", body.area || "", target, now).run();
  var row = await db.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  return json(mapProject(row), 201);
}
async function projectsUpdate(db, id, body) {
  var target = body.target === "" || body.target === null || body.target === undefined ? null : Number(body.target);
  await db.prepare(
    "UPDATE projects SET name = ?, area = ?, target = ? WHERE id = ?"
  ).bind(body.name || "", body.area || "", target, id).run();
  var row = await db.prepare("SELECT * FROM projects WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "Not found" }, 404);
  return json(mapProject(row));
}
async function projectsDelete(db, id) {
  await db.prepare("UPDATE todos SET project_id = NULL WHERE project_id = ?").bind(id).run();
  await db.prepare("UPDATE notes SET project_id = NULL WHERE project_id = ?").bind(id).run();
  await db.prepare("UPDATE events SET project_id = NULL WHERE project_id = ?").bind(id).run();
  await db.prepare("DELETE FROM projects WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

// ---------- todos ----------

async function todosList(db) {
  var res = await db.prepare("SELECT * FROM todos ORDER BY created_at DESC").all();
  return json(res.results.map(mapTodo));
}
async function todosCreate(db, body) {
  var id = newId();
  var now = Date.now();
  await db.prepare(
    "INSERT INTO todos (id, text, due, done, contact_id, project_id, created_at) VALUES (?, ?, ?, 0, ?, ?, ?)"
  ).bind(id, body.text || "", body.due || null, body.clientId || null, body.projectId || null, now).run();
  var row = await db.prepare("SELECT * FROM todos WHERE id = ?").bind(id).first();
  return json(mapTodo(row), 201);
}
async function todosUpdate(db, id, body) {
  await db.prepare("UPDATE todos SET done = ? WHERE id = ?").bind(body.done ? 1 : 0, id).run();
  var row = await db.prepare("SELECT * FROM todos WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "Not found" }, 404);
  return json(mapTodo(row));
}
async function todosDelete(db, id) {
  await db.prepare("DELETE FROM todos WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

// ---------- notes ----------

async function notesList(db) {
  var res = await db.prepare("SELECT * FROM notes ORDER BY created_at DESC").all();
  return json(res.results.map(mapNote));
}
async function notesCreate(db, body) {
  var id = newId();
  var now = Date.now();
  await db.prepare(
    "INSERT INTO notes (id, text, date, contact_id, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(id, body.text || "", body.date || "", body.clientId || null, body.projectId || null, now).run();
  var row = await db.prepare("SELECT * FROM notes WHERE id = ?").bind(id).first();
  return json(mapNote(row), 201);
}
async function notesUpdate(db, id, body) {
  var now = Date.now();
  await db.prepare("UPDATE notes SET text = ?, updated_at = ? WHERE id = ?").bind(body.text || "", now, id).run();
  var row = await db.prepare("SELECT * FROM notes WHERE id = ?").bind(id).first();
  if (!row) return json({ error: "Not found" }, 404);
  return json(mapNote(row));
}
async function notesDelete(db, id) {
  await db.prepare("DELETE FROM notes WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

// ---------- events ----------

async function eventsList(db) {
  var res = await db.prepare("SELECT * FROM events ORDER BY date, time").all();
  return json(res.results.map(mapEvent));
}
async function eventsCreate(db, body) {
  var id = newId();
  var now = Date.now();
  await db.prepare(
    "INSERT INTO events (id, title, date, time, contact_id, project_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, body.title || "", body.date || "", body.time || null, body.clientId || null, body.projectId || null, now).run();
  var row = await db.prepare("SELECT * FROM events WHERE id = ?").bind(id).first();
  return json(mapEvent(row), 201);
}
async function eventsDelete(db, id) {
  await db.prepare("DELETE FROM events WHERE id = ?").bind(id).run();
  return json({ ok: true });
}

// ---------- router ----------

export async function onRequest(context) {
  var request = context.request;
  var env = context.env;
  var pathParam = context.params.path;
  var segments = Array.isArray(pathParam) ? pathParam : (pathParam ? [pathParam] : []);
  var resource = segments[0];
  var id = segments[1];
  var method = request.method;
  var db = env.DB;

  if (!db) return json({ error: "D1 database not bound. Add a D1 binding named DB in the Pages project settings." }, 500);

  var body = null;
  if (method === "POST" || method === "PUT" || method === "PATCH") {
    try { body = await request.json(); } catch (e) { body = {}; }
  }

  try {
    if (resource === "contacts") {
      if (method === "GET" && !id) return await contactsList(db);
      if (method === "POST" && !id) return await contactsCreate(db, body);
      if (method === "PUT" && id) return await contactsUpdate(db, id, body);
      if (method === "DELETE" && id) return await contactsDelete(db, id);
    }
    if (resource === "projects") {
      if (method === "GET" && !id) return await projectsList(db);
      if (method === "POST" && !id) return await projectsCreate(db, body);
      if (method === "PUT" && id) return await projectsUpdate(db, id, body);
      if (method === "DELETE" && id) return await projectsDelete(db, id);
    }
    if (resource === "todos") {
      if (method === "GET" && !id) return await todosList(db);
      if (method === "POST" && !id) return await todosCreate(db, body);
      if (method === "PATCH" && id) return await todosUpdate(db, id, body);
      if (method === "DELETE" && id) return await todosDelete(db, id);
    }
    if (resource === "notes") {
      if (method === "GET" && !id) return await notesList(db);
      if (method === "POST" && !id) return await notesCreate(db, body);
      if (method === "PATCH" && id) return await notesUpdate(db, id, body);
      if (method === "DELETE" && id) return await notesDelete(db, id);
    }
    if (resource === "events") {
      if (method === "GET" && !id) return await eventsList(db);
      if (method === "POST" && !id) return await eventsCreate(db, body);
      if (method === "DELETE" && id) return await eventsDelete(db, id);
    }
    return json({ error: "Not found" }, 404);
  } catch (err) {
    return json({ error: (err && err.message) || String(err) }, 500);
  }
}
