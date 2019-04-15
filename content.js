class gitlabTreeview {
    rssMode;
    rssToken;
    privateToken;
    apiRootUrl;
    projectId;
    apiRepoTree;
    repositoryRef;
    shortcutsProject;

    constructor() {
        if (!this.isGitLab() || !this.isFilePage()) {
            return;
        }

        this.initVariables();
        this.setTreeNav();
        this.loadData();
    }

    isGitLab() {
        const isGitLab = document.querySelector('meta[content^="GitLab"]');
        return !!isGitLab;
    }

    isFilePage() {
        const page = document.querySelector('body').dataset.page;
        return page === 'projects:show' || 'projects:blob:show';
    }

    initVariables() {
        if (document.querySelector('head link[rel="alternate"]')) {
            const href = document.querySelector('head link[rel="alternate"]').getAttribute('href');
            const index = href.indexOf("=");
            if (index > -1) {
                this.rssMode = href.indexOf("rss_token") > -1;
                this.privateToken = href.substring(index + 1);
                this.rssToken = href.substring(index + 1);
            }
        }
        this.apiRootUrl = window.location.origin;
        this.projectId = $('#project_id').val() || $('#search_project_id').val();
        this.apiRepoTree = this.apiRootUrl + '/api/v4/projects/' + this.projectId + '/repository/tree';
        this.repositoryRef = document.getElementById('repository_ref').value;
        this.shortcutsProject = document.querySelector('.shortcuts-project').getAttribute('href');
        this.shortcutsProject = this.shortcutsProject.substring(1);

        console.log(`
        rssToken: ${this.rssToken}
        rssMode: ${this.rssMode}
        privateToken: ${this.privateToken}
        repositoryRef: ${this.repositoryRef}
        apiRepoTree: ${this.apiRepoTree}
        apiRootUrl: ${this.apiRootUrl}
        projectId: ${this.projectId}
        shortcutsProject: ${this.shortcutsProject}
        `);
    }

    setTreeNav() {
        const template = `
            <div class="treeview">
                <div class="treeview__content"></div>
            </div>
        `;

        document.querySelector('.sidebar-top-level-items').insertAdjacentHTML('beforeend', template);

        const me = this;
        $(document).on('click', '.treeview__item', function (ev) {
            ev.stopPropagation();
            me.treeItemClickHandler(this);
        });
    }

    loadData(parent) {
        if (parent) {
            parent.dataset.state = 'loading';
        }
        const params = {
            id: this.projectId,
            path: parent ? parent.dataset.path : null,
            ref: this.repositoryRef
        };

        if (this.rssMode) {
            params.rssToken = this.rssToken;
        } else {
            params.privateToken = this.privateToken;
        }

        $.get(this.apiRepoTree, params, response => {
            if (parent) {
                parent.dataset.isAjaxing = '0';
                parent.dataset.zAsync = '1';
            }
            this.updateTree(parent, response);
        });
    }

    updateTree(parent, list) {
        let listTemplate = [];
        let i = 0;
        const listLen = list.length;
        const level = parent ? +parent.dataset.level + 1 : 1;

        for (; i < listLen; i++) {
            listTemplate.push(`
                <div class="treeview__item treeview__closed"
                     id="treeview__item-${list[i]['id']}" 
                     data-id="${list[i]['id']}" 
                     data-mode="${list[i]['mode']}" 
                     data-path="${list[i]['path']}" 
                     data-type="${list[i]['type']}"
                     data-state="close"
                     data-loaded="0"
                     data-level="${level}">
                    <div class="treeview__item-wrapper" style="padding-left: ${level * 20}px;">
                        <div class="treeview__tree-icon">
                            ${list[i]['type'] === 'tree' ? `<i class="fa fa-caret-right"></i>` : `<i class="fa"></i>`}
                        </div>
                        <div class="treeview__file-icon">
                            <i class="fa ${this.getFileIcon(list[i]['type'])}"></i>
                        </div>
                        <div class="treeview__file-name">${list[i]['name']}</div>
                    </div>
                    <div class="treeview__child"></div>
                </div>
            `);
        }

        const template = `<div class="treeview__list">${listTemplate.join('')}</div>`;

        const container = parent ? `#treeview__item-${parent.dataset.id} > .treeview__child` : '.treeview__content';
        document.querySelector(container).innerHTML = template;

        if (parent) {
            parent.dataset.loaded = '1';
            parent.dataset.state = 'open';
        }
    }

    getFileIcon(type) {
        let icon = {
            tree: 'fa-folder-o',
            blob: 'fa-file-text-o'
        }[type];

        return icon || 'fa-file-text-o';
    }

    treeItemClickHandler(item) {
        if (item.dataset.state === 'loading') {
            return;
        }

        if (item.dataset.type === 'blob') {
            this.openFile(item);
        } else {
            this.toggleTree(item);
        }
    }

    toggleTree(item) {
        const state = item.dataset.state;
        if (state === 'open') {
            this.hideTree(item);
        } else if (state === 'close') {
            if (item.dataset.loaded === '1') {
                this.showTree(item);
            } else {
                this.loadData(item);
            }
        }
    }

    showTree(item) {
        item.dataset.state = 'open';
    }

    hideTree(item) {
        item.dataset.state = 'close';
    }

    openFile(item) {
        item.dataset.state = 'loading';
        const href = `/${this.shortcutsProject}/blob/${this.repositoryRef}/${item.dataset.path}`;
        const fullHref = `${window.location.origin}${href}`;

        $.ajax({
            type: "GET",
            url: fullHref,
            dataType: 'html',
            success: function (response) {
                const content = $(response).find(".content-wrapper").html();

                try {
                    $(".content-wrapper").html(content);
                } catch (err) {

                } finally {
                    $.ajax({
                        type: "GET",
                        url: fullHref + '?format=json&viewer=simple',
                        dataType: 'json',
                        success: function (response) {
                            $(".blob-viewer").replaceWith(response.html);
                            item.dataset.state = 'open';
                            history.pushState({}, "", href);
                        }
                    });
                }
            }
        })
    }
}

$(() => {
    new gitlabTreeview();
});