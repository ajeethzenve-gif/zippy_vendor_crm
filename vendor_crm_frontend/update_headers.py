import re
def update_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()

    # Import useNavigate and useAuth if missing
    if 'useNavigate' not in content:
        content = content.replace('import { Link } from "react-router-dom";', 'import { Link, useNavigate } from "react-router-dom";')
    if 'useAuth' not in content:
        content = content.replace('import { showToast }', 'import { useAuth } from "../context/AuthContext";\nimport { showToast }')
        content = content.replace('import { getProducts', 'import { useAuth } from "../context/AuthContext";\nimport { getProducts')

    # Add the icons if missing
    icons = '''
function UserProfileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
'''
    if 'UserProfileIcon' not in content:
        content = content.replace('/* =========================================================\n   ICONS & SWITCH', '/* =========================================================\n   ICONS & SWITCH\n========================================================= */\n' + icons + '\n/*')
        content = content.replace('/* -------------------------------------------------------\n   ICONS', '/* -------------------------------------------------------\n   ICONS\n------------------------------------------------------- */\n' + icons + '\n/*')

    # Add hooks to component body
    component_name = 'Catalogue' if 'Catalogue' in filename else 'Storefront'
    body_marker = f'export default function {component_name}() {{'
    hooks = '''
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isVendor = currentUser?.id === "designer";
'''
    if 'navigate = useNavigate' not in content:
        content = content.replace(body_marker, body_marker + hooks)

    # Add the header actions group
    actions = '''
        {isVendor && <div className="ZENVE-header-actions-group">
          <button type="button" className="ZENVE-header-profile-btn ZENVE-header-media-btn" aria-label="Media Content" onClick={() => navigate("/vendor-dashboard?view=media")}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8" cy="8" r="1.5" /><path d="m21 15-5-5L5 21m9-7-4-4-7 7" /></svg>
          </button>
          <button type="button" className="ZENVE-header-profile-btn" onClick={() => navigate("/vendor-dashboard?view=profile")} aria-label="Profile and Account Details">
            <UserProfileIcon />
          </button>
          <button type="button" className="ZENVE-header-notif-btn" onClick={() => navigate("/vendor-dashboard?view=notifications")} aria-label="Notifications">
            <BellIcon />
          </button>
        </div>}
'''
    if 'ZENVE-header-actions-group' not in content:
        # For Catalogue
        content = content.replace('</p>\n          </div>\n        </div>\n      </header>', '</p>\n          </div>\n        </div>\n' + actions + '\n      </header>')
        # For Storefront
        content = content.replace('</p>\n          </div>\n        </div>\n\n      </header>', '</p>\n          </div>\n        </div>\n' + actions + '\n      </header>')
        # Try finding just header closing if not matched exactly
        if 'ZENVE-header-actions-group' not in content:
            content = content.replace('</div>\n      </header>', '</div>\n' + actions + '\n      </header>')

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Updated {filename}')

update_file('src/pages/Catalogue.jsx')
update_file('src/pages/Storefront.jsx')
