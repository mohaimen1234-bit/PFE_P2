package com.cmms.maintenance.repository;

import com.cmms.maintenance.entity.TaskTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskTemplateRepository extends JpaRepository<TaskTemplate, Integer> {
    List<TaskTemplate> findByIsActiveTrue();
    List<TaskTemplate> findByDepartmentId(Integer departmentId);
}
