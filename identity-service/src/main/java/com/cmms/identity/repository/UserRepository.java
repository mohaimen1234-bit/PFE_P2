package com.cmms.identity.repository;

import com.cmms.identity.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

@Repository
public interface UserRepository extends JpaRepository<User, Integer>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByRoles_RoleId(Integer roleId);

    boolean existsByDepartment_DepartmentId(Integer departmentId);

    List<User> findByIsActiveTrue();
}
