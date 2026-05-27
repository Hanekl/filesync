# 역할별 기본 권한 정의
ROLE_PERMISSIONS = {
    "super_admin": {
        "display_name": "최고 관리자",
        "can_chat": True,
        "can_upload_files": True,
        "can_access_server_storage": True,
        "can_create_room": True,
        "can_manage_dept_users": True,
        "can_create_accounts": True,
        "can_manage_all_users": True,
        "can_change_roles": True,
        "can_manage_departments": True,
        "can_post_announcements": True,
        "can_system_settings": True,
    },
    "admin": {
        "display_name": "관리자",
        "can_chat": True,
        "can_upload_files": True,
        "can_access_server_storage": True,
        "can_create_room": True,
        "can_manage_dept_users": True,
        "can_create_accounts": True,
        "can_manage_all_users": True,
        "can_change_roles": True,
        "can_manage_departments": True,
        "can_post_announcements": True,
        "can_system_settings": False,
    },
    "manager": {
        "display_name": "부서 관리자",
        "can_chat": True,
        "can_upload_files": True,
        "can_access_server_storage": True,
        "can_create_room": True,
        "can_manage_dept_users": True,
        "can_create_accounts": True,
        "can_manage_all_users": False,
        "can_change_roles": False,
        "can_manage_departments": False,
        "can_post_announcements": False,
        "can_system_settings": False,
    },
    "member": {
        "display_name": "일반 직원",
        "can_chat": True,
        "can_upload_files": True,
        "can_access_server_storage": True,
        "can_create_room": True,
        "can_manage_dept_users": False,
        "can_create_accounts": False,
        "can_manage_all_users": False,
        "can_change_roles": False,
        "can_manage_departments": False,
        "can_post_announcements": False,
        "can_system_settings": False,
    },
    "guest": {
        "display_name": "외부 협력사",
        "can_chat": True,
        "can_upload_files": True,
        "can_access_server_storage": False,
        "can_create_room": False,
        "can_manage_dept_users": False,
        "can_create_accounts": False,
        "can_manage_all_users": False,
        "can_change_roles": False,
        "can_manage_departments": False,
        "can_post_announcements": False,
        "can_system_settings": False,
    },
}

# 권한 확인 함수
def has_permission(role: str, permission: str) -> bool:
    if role not in ROLE_PERMISSIONS:
        return False
    return ROLE_PERMISSIONS[role].get(permission, False)

# 역할 표시 이름 가져오기
def get_display_name(role: str) -> str:
    if role not in ROLE_PERMISSIONS:
        return role
    return ROLE_PERMISSIONS[role].get("display_name", role)