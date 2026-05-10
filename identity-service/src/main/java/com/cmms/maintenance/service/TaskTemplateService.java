package com.cmms.maintenance.service;

import com.cmms.maintenance.dto.TaskTemplateResponse;
import com.cmms.maintenance.entity.TaskTemplate;
import com.cmms.maintenance.entity.TaskTemplateItem;
import com.cmms.maintenance.repository.TaskTemplateItemRepository;
import com.cmms.maintenance.repository.TaskTemplateRepository;
import com.cmms.claims.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskTemplateService {

    private final TaskTemplateRepository templateRepository;
    private final TaskTemplateItemRepository itemRepository;

    @Transactional(readOnly = true)
    public List<TaskTemplateResponse> getAllActive() {
        return templateRepository.findByIsActiveTrue().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public TaskTemplateResponse getById(Integer id) {
        TaskTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));
        return toResponse(template);
    }

    @Transactional
    public TaskTemplateResponse createTemplate(com.cmms.maintenance.dto.CreateTaskTemplateRequest request) {
        TaskTemplate template = TaskTemplate.builder()
                .code(request.getCode())
                .name(request.getName())
                .description(request.getDescription())
                .equipmentCategoryId(request.getEquipmentCategoryId())
                .departmentId(request.getDepartmentId())
                .defaultPriority(request.getDefaultPriority() != null ? com.cmms.maintenance.entity.Task.TaskPriority.valueOf(request.getDefaultPriority()) : com.cmms.maintenance.entity.Task.TaskPriority.MEDIUM)
                .estimatedHours(request.getEstimatedHours())
                .defaultAssigneeRole(request.getDefaultAssigneeRole())
                .requiresValidation(request.getRequiresValidation() != null ? request.getRequiresValidation() : false)
                .requiresDocument(request.getRequiresDocument() != null ? request.getRequiresDocument() : false)
                .isActive(request.getIsActive() != null ? request.getIsActive() : true)
                .build();

        TaskTemplate savedTemplate = templateRepository.save(template);

        if (request.getItems() != null) {
            for (com.cmms.maintenance.dto.CreateTaskTemplateRequest.ItemRequest itemReq : request.getItems()) {
                TaskTemplateItem item = TaskTemplateItem.builder()
                        .templateId(savedTemplate.getTemplateId())
                        .label(itemReq.getLabel())
                        .description(itemReq.getDescription())
                        .sortOrder(itemReq.getSortOrder())
                        .isRequired(itemReq.getIsRequired() != null ? itemReq.getIsRequired() : true)
                        .estimatedMinutes(itemReq.getEstimatedMinutes())
                        .build();
                itemRepository.save(item);
            }
        }

        return toResponse(savedTemplate);
    }

    @Transactional
    public TaskTemplateResponse updateTemplate(Integer id, com.cmms.maintenance.dto.CreateTaskTemplateRequest request) {
        TaskTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Template not found"));

        template.setCode(request.getCode());
        template.setName(request.getName());
        template.setDescription(request.getDescription());
        template.setEquipmentCategoryId(request.getEquipmentCategoryId());
        template.setDepartmentId(request.getDepartmentId());
        if (request.getDefaultPriority() != null) {
            template.setDefaultPriority(com.cmms.maintenance.entity.Task.TaskPriority.valueOf(request.getDefaultPriority()));
        }
        template.setEstimatedHours(request.getEstimatedHours());
        template.setDefaultAssigneeRole(request.getDefaultAssigneeRole());
        template.setRequiresValidation(request.getRequiresValidation());
        template.setRequiresDocument(request.getRequiresDocument());
        template.setIsActive(request.getIsActive());

        TaskTemplate savedTemplate = templateRepository.save(template);

        // Simple sync: delete old items and save new ones
        itemRepository.deleteByTemplateId(id);
        if (request.getItems() != null) {
            for (com.cmms.maintenance.dto.CreateTaskTemplateRequest.ItemRequest itemReq : request.getItems()) {
                TaskTemplateItem item = TaskTemplateItem.builder()
                        .templateId(savedTemplate.getTemplateId())
                        .label(itemReq.getLabel())
                        .description(itemReq.getDescription())
                        .sortOrder(itemReq.getSortOrder())
                        .isRequired(itemReq.getIsRequired())
                        .estimatedMinutes(itemReq.getEstimatedMinutes())
                        .build();
                itemRepository.save(item);
            }
        }

        return toResponse(savedTemplate);
    }

    @Transactional
    public void deleteTemplate(Integer id) {
        if (!templateRepository.existsById(id)) {
            throw new ResourceNotFoundException("Template not found");
        }
        itemRepository.deleteByTemplateId(id);
        templateRepository.deleteById(id);
    }

    private TaskTemplateResponse toResponse(TaskTemplate template) {
        List<TaskTemplateItem> items = itemRepository.findByTemplateIdOrderBySortOrderAsc(template.getTemplateId());
        
        return TaskTemplateResponse.builder()
                .id(template.getTemplateId())
                .code(template.getCode())
                .name(template.getName())
                .description(template.getDescription())
                .equipmentCategoryId(template.getEquipmentCategoryId())
                .departmentId(template.getDepartmentId())
                .defaultPriority(template.getDefaultPriority() != null ? template.getDefaultPriority().name() : null)
                .estimatedHours(template.getEstimatedHours())
                .defaultAssigneeRole(template.getDefaultAssigneeRole())
                .requiresValidation(template.getRequiresValidation())
                .requiresDocument(template.getRequiresDocument())
                .isActive(template.getIsActive())
                .createdAt(template.getCreatedAt())
                .updatedAt(template.getUpdatedAt())
                .items(items.stream()
                        .map(item -> TaskTemplateResponse.TaskTemplateItemDTO.builder()
                                .id(item.getId())
                                .label(item.getLabel())
                                .description(item.getDescription())
                                .sortOrder(item.getSortOrder())
                                .isRequired(item.getIsRequired())
                                .estimatedMinutes(item.getEstimatedMinutes())
                                .build())
                        .collect(Collectors.toList()))
                .build();
    }
}
