package com.cmms.maintenance.repository;

import com.cmms.maintenance.entity.TaskTemplateItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskTemplateItemRepository extends JpaRepository<TaskTemplateItem, Integer> {
    List<TaskTemplateItem> findByTemplateIdOrderBySortOrderAsc(Integer templateId);
    void deleteByTemplateId(Integer templateId);
}
