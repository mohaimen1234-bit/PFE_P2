package com.cmms.maintenance.controller;

import com.cmms.maintenance.dto.TaskTemplateResponse;
import com.cmms.maintenance.service.TaskTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/task-templates")
@RequiredArgsConstructor
public class TaskTemplateController {

    private final TaskTemplateService templateService;

    @GetMapping
    public ResponseEntity<List<TaskTemplateResponse>> getAll() {
        return ResponseEntity.ok(templateService.getAllActive());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TaskTemplateResponse> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(templateService.getById(id));
    }

    @PostMapping
    public ResponseEntity<TaskTemplateResponse> create(@RequestBody com.cmms.maintenance.dto.CreateTaskTemplateRequest request) {
        return ResponseEntity.ok(templateService.createTemplate(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaskTemplateResponse> update(@PathVariable Integer id, @RequestBody com.cmms.maintenance.dto.CreateTaskTemplateRequest request) {
        return ResponseEntity.ok(templateService.updateTemplate(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        templateService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }
}
