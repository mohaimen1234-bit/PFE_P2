package com.cmms.identity.repository;

import com.cmms.identity.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Integer> {
    Optional<Department> findByDepartmentName(String departmentName);
    
    boolean existsByDepartmentNameIgnoreCase(String departmentName);
    
    Optional<Department> findByDepartmentNameIgnoreCase(String departmentName);
}
