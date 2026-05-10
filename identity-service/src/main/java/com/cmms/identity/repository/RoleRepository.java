package com.cmms.identity.repository;

import com.cmms.identity.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Integer> {

    Optional<Role> findByRoleName(String roleName);
    
    boolean existsByRoleNameIgnoreCase(String roleName);
    
    Optional<Role> findByRoleNameIgnoreCase(String roleName);
}
