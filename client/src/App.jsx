
import { useEffect, useState } from "react";
import "./App.css";

const API = "http://localhost:9000";

const PRIORITIES = ["High", "Medium", "Low"];
const STORY_STATUSES = ["To Do", "In Progress", "Done"];

function App() {
    const [users, setUsers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [members, setMembers] = useState([]);
    const [stories, setStories] = useState([]);

    const [message, setMessage] = useState("");
    const [error, setError] = useState(false);

    // Project form
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("Planning");
    const [leadId, setLeadId] = useState("");
    const [memberId, setMemberId] = useState("");

    // User story form
    const [storyTitle, setStoryTitle] = useState("");
    const [storyDescription, setStoryDescription] = useState("");
    const [storyPriority, setStoryPriority] = useState("Medium");
    const [storyStatus, setStoryStatus] = useState("To Do");
    const [assignedUserId, setAssignedUserId] = useState("");
    const [editingStoryId, setEditingStoryId] = useState("");
    const [selectedStoryId, setSelectedStoryId] = useState("");

    async function request(path, options = {}) {
        const response = await fetch(API + path, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...options.headers
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || "Request failed");
        }

        return data;
    }

    function showMessage(text, isError = false) {
        setMessage(text);
        setError(isError);
    }

    async function loadUsers() {
        setUsers(await request("/users"));
    }

    async function loadProjects() {
        const data = await request("/projects");
        setProjects(data);

        if (
            selectedProject &&
            !data.some(project => project._id === selectedProject)
        ) {
            setSelectedProject("");
            setMembers([]);
            setStories([]);
            clearStoryForm();
            setSelectedStoryId("");
        }
    }

    async function loadMembers(projectId) {
        if (!projectId) {
            setMembers([]);
            return;
        }

        setMembers(
            await request(`/projects/${projectId}/members`)
        );
    }

    async function loadStories(projectId) {
        if (!projectId) {
            setStories([]);
            return;
        }

        setStories(
            await request(`/projects/${projectId}/stories`)
        );
    }

    function clearStoryForm() {
        setStoryTitle("");
        setStoryDescription("");
        setStoryPriority("Medium");
        setStoryStatus("To Do");
        setAssignedUserId("");
        setEditingStoryId("");
    }

    async function selectProject(projectId) {
        setSelectedProject(projectId);

        // Clear the previous project's information.
        setMembers([]);
        setStories([]);
        setMemberId("");
        setSelectedStoryId("");
        clearStoryForm();

        if (!projectId) {
            return;
        }

        try {
            await Promise.all([
                loadMembers(projectId),
                loadStories(projectId)
            ]);
        } catch (err) {
            showMessage(err.message, true);
        }
    }

    useEffect(() => {
        async function initialize() {
            try {
                await Promise.all([
                    loadUsers(),
                    loadProjects()
                ]);
            } catch (err) {
                showMessage(err.message, true);
            }
        }

        initialize();
    }, []);

    // CREATE PROJECT
    async function createProject(event) {
        event.preventDefault();

        try {
            await request("/projects", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    description,
                    status,
                    project_lead_id: leadId
                })
            });

            setName("");
            setDescription("");
            setStatus("Planning");
            setLeadId("");

            showMessage("Project created successfully!");

            await loadProjects();
            await loadUsers();
        } catch (err) {
            showMessage(err.message, true);
        }
    }

    // ADD PROJECT MEMBER
    async function addMember(event) {
        event.preventDefault();

        if (!selectedProject || !memberId) {
            showMessage("Select a project and user first.", true);
            return;
        }

        try {
            const data = await request(
                `/projects/${selectedProject}/members`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        user_id: memberId
                    })
                }
            );

            showMessage(data.message);
            setMemberId("");
            await loadMembers(selectedProject);
        } catch (err) {
            showMessage(err.message, true);
        }
    }

    // REMOVE PROJECT MEMBER
    async function removeMember(userId) {
        try {
            const data = await request(
                `/projects/${selectedProject}/members/${userId}`,
                { method: "DELETE" }
            );

            showMessage(data.message);
            await loadMembers(selectedProject);
        } catch (err) {
            showMessage(err.message, true);
        }
    }

    // CREATE OR UPDATE USER STORY
    async function saveStory(event) {
        event.preventDefault();

        if (!selectedProject) {
            showMessage("Select a project before creating a story.", true);
            return;
        }

        if (!storyTitle.trim() || !storyDescription.trim()) {
            showMessage("Story title and description are required.", true);
            return;
        }

        if (!PRIORITIES.includes(storyPriority)) {
            showMessage("Select a valid priority.", true);
            return;
        }

        try {
            const storyData = {
                title: storyTitle.trim(),
                description: storyDescription.trim(),
                priority: storyPriority,
                assigned_user_id: assignedUserId || null
            };

            let result;

            if (editingStoryId) {
                result = await request(
                    `/projects/${selectedProject}/stories/${editingStoryId}`,
                    {
                        method: "PUT",
                        body: JSON.stringify({
                            ...storyData,
                            status: storyStatus
                        })
                    }
                );
            } else {
                result = await request(
                    `/projects/${selectedProject}/stories`,
                    {
                        method: "POST",
                        body: JSON.stringify(storyData)
                    }
                );
            }

            showMessage(result.message);
            clearStoryForm();
            setSelectedStoryId("");
            await loadStories(selectedProject);
        } catch (err) {
            showMessage(err.message, true);
        }
    }

    // LOAD A STORY INTO THE EDIT FORM
    function editStory(story) {
        setEditingStoryId(story._id);
        setStoryTitle(story.title);
        setStoryDescription(story.description);
        setStoryPriority(story.priority);
        setStoryStatus(story.status);
        setAssignedUserId(story.assigned_user_id || "");
        setSelectedStoryId(story._id);

        showMessage("Editing user story.");
    }

    // CANCEL STORY EDITING
    function cancelStoryEdit() {
        clearStoryForm();
        setSelectedStoryId("");
        showMessage("Editing cancelled.");
    }

    // DELETE USER STORY
    async function deleteStory(storyId) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this user story? This action cannot be undone."
        );

        if (!confirmed) {
            return;
        }

        try {
            const data = await request(
                `/projects/${selectedProject}/stories/${storyId}`,
                { method: "DELETE" }
            );

            if (editingStoryId === storyId) {
                clearStoryForm();
            }

            if (selectedStoryId === storyId) {
                setSelectedStoryId("");
            }

            showMessage(data.message);
            await loadStories(selectedProject);
        } catch (err) {
            showMessage(err.message, true);
        }
    }

    return (
        <main className="app">
            <h1>Project Management System</h1>
            <p>Create projects, manage memberships, and organize user stories.</p>

            {message && (
                <p
                    role="status"
                    style={{
                        color: error ? "crimson" : "green",
                        fontWeight: "bold"
                    }}
                >
                    {message}
                </p>
            )}

            {/* CREATE PROJECT */}
            <section>
                <h2>Create Project</h2>

                <form onSubmit={createProject}>
                    <label>
                        Project Name
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                        />
                    </label>

                    <label>
                        Description
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            required
                        />
                    </label>

                    <label>
                        Status
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                        >
                            <option>Planning</option>
                            <option>Active</option>
                            <option>Completed</option>
                        </select>
                    </label>

                    <label>
                        Project Lead
                        <select
                            value={leadId}
                            onChange={e => setLeadId(e.target.value)}
                            required
                        >
                            <option value="">Select a registered user</option>

                            {users.map(user => (
                                <option key={user._id} value={user._id}>
                                    {user.name} ({user.username})
                                </option>
                            ))}
                        </select>
                    </label>

                    <button type="submit">Create Project</button>
                </form>
            </section>

            {/* PROJECT LIST */}
            <section>
                <h2>Projects</h2>

                <button
                    type="button"
                    onClick={() => {
                        loadProjects().catch(
                            err => showMessage(err.message, true)
                        );
                    }}
                >
                    Refresh Projects
                </button>

                {projects.length === 0 && (
                    <p>No projects created yet.</p>
                )}

                {projects.map(project => (
                    <article key={project._id} className="project-card">
                        <h3>{project.name}</h3>
                        <p>{project.description}</p>

                        <p>
                            <strong>Status:</strong> {project.status}
                        </p>

                        <p>
                            <strong>Project Lead:</strong>{" "}
                            {project.lead_name} ({project.lead_username})
                        </p>

                        <button
                            type="button"
                            onClick={() => selectProject(project._id)}
                        >
                            Manage Project
                        </button>
                    </article>
                ))}
            </section>

            {/* PROJECT MEMBERSHIPS */}
            <section>
                <h2>Manage Project Memberships</h2>

                <label>
                    Select Project
                    <select
                        value={selectedProject}
                        onChange={e => selectProject(e.target.value)}
                    >
                        <option value="">Select a project</option>

                        {projects.map(project => (
                            <option key={project._id} value={project._id}>
                                {project.name}
                            </option>
                        ))}
                    </select>
                </label>

                {selectedProject && (
                    <>
                        <h3>Current Members</h3>

                        {members.length === 0 && (
                            <p>No members found.</p>
                        )}

                        <ul>
                            {members.map(member => (
                                <li key={member.user_id}>
                                    {member.name} ({member.username})

                                    {member.is_lead ? (
                                        <strong>
                                            {" "}— Project Lead (cannot remove)
                                        </strong>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => removeMember(member.user_id)}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>

                        <form onSubmit={addMember}>
                            <label>
                                Add Registered User
                                <select
                                    value={memberId}
                                    onChange={e => setMemberId(e.target.value)}
                                    required
                                >
                                    <option value="">Select a user</option>

                                    {users
                                        .filter(user => !members.some(
                                            member => member.user_id === user._id
                                        ))
                                        .map(user => (
                                            <option
                                                key={user._id}
                                                value={user._id}
                                            >
                                                {user.name} ({user.username})
                                            </option>
                                        ))}
                                </select>
                            </label>

                            <button type="submit">Add Member</button>
                        </form>
                    </>
                )}
            </section>

            {/* USER STORY BACKLOG */}
            <section>
                <h2>User Stories / Project Backlog</h2>

                {!selectedProject ? (
                    <p>Select a project above to view and manage its backlog.</p>
                ) : (
                    <>
                        <h3>Create a User Story</h3>

                        <form onSubmit={saveStory}>
                            <label>
                                Story Title
                                <input
                                    value={storyTitle}
                                    onChange={e => setStoryTitle(e.target.value)}
                                    placeholder="Enter a story title"
                                    required
                                />
                            </label>

                            <label>
                                User Story Description
                                <textarea
                                    value={storyDescription}
                                    onChange={e => setStoryDescription(e.target.value)}
                                    placeholder="As a [user], I want [goal], so that [benefit]."
                                    required
                                />
                            </label>

                            <label>
                                Priority
                                <select
                                    value={storyPriority}
                                    onChange={e => setStoryPriority(e.target.value)}
                                >
                                    {PRIORITIES.map(priority => (
                                        <option key={priority} value={priority}>
                                            {priority}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            {editingStoryId && (
                                <label>
                                    Status
                                    <select
                                        value={storyStatus}
                                        onChange={e => setStoryStatus(e.target.value)}
                                    >
                                        {STORY_STATUSES.map(storyStatusOption => (
                                            <option
                                                key={storyStatusOption}
                                                value={storyStatusOption}
                                            >
                                                {storyStatusOption}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}

                            <label>
                                Assign to Project Member
                                <select
                                    value={assignedUserId}
                                    onChange={e => setAssignedUserId(e.target.value)}
                                >
                                    <option value="">Unassigned</option>

                                    {members.map(member => (
                                        <option
                                            key={member.user_id}
                                            value={member.user_id}
                                        >
                                            {member.name} ({member.username})
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <button type="submit">
                                {editingStoryId
                                    ? "Save Changes"
                                    : "Create User Story"}
                            </button>

                            {editingStoryId && (
                                <button
                                    type="button"
                                    onClick={cancelStoryEdit}
                                >
                                    Cancel Editing
                                </button>
                            )}
                        </form>

                        {!editingStoryId && (
                            <p>
                                <strong>Note:</strong> New user stories
                                automatically start with the status To Do.
                            </p>
                        )}

                        <h3>Project Backlog</h3>

                        <button
                            type="button"
                            onClick={() => {
                                loadStories(selectedProject).catch(
                                    err => showMessage(err.message, true)
                                );
                            }}
                        >
                            Refresh Backlog
                        </button>

                        {stories.length === 0 ? (
                            <p>
                                No user stories have been created for this
                                project yet.
                            </p>
                        ) : (
                            stories.map(story => (
                                <article
                                    key={story._id}
                                    className="project-card"
                                >
                                    <h4>{story.title}</h4>

                                    <p>
                                        <strong>Priority:</strong>{" "}
                                        {story.priority}
                                    </p>

                                    <p>
                                        <strong>Status:</strong>{" "}
                                        {story.status}
                                    </p>

                                    <p>
                                        <strong>Assigned Member:</strong>{" "}
                                        {story.assigned_member_name}
                                        {story.assigned_member_username !== "Unassigned" &&
                                            ` (${story.assigned_member_username})`}
                                    </p>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedStoryId(
                                                selectedStoryId === story._id
                                                    ? ""
                                                    : story._id
                                            );
                                        }}
                                    >
                                        {selectedStoryId === story._id
                                            ? "Hide Description"
                                            : "View Description"}
                                    </button>

                                    {selectedStoryId === story._id && (
                                        <p>{story.description}</p>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => editStory(story)}
                                    >
                                        Edit Story
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => deleteStory(story._id)}
                                    >
                                        Delete Story
                                    </button>
                                </article>
                            ))
                        )}
                    </>
                )}
            </section>
        </main>
    );
}

export default App;
