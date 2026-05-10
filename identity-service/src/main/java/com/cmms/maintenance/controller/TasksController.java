package com.cmms.maintenance.controller;

import com.cmms.maintenance.dto.CreateTaskRequest;
import com.cmms.maintenance.dto.TaskResponse;
import com.cmms.maintenance.dto.UpdateTaskRequest;
import com.cmms.maintenance.service.TaskService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
@Tag(name = "Tasks", description = "Work order task steps management")
@SecurityRequirement(name = "bearerAuth")
public class TasksController {

    private final TaskService taskService;
    
    @GetMapping
    @Operation(summary = "List all tasks")
    public List<TaskResponse> getAll() {
        return taskService.getAll();
    }

    @GetMapping("/work-order/{woId}")
    @Operation(summary = "Get tasks for a work order")
    public List<TaskResponse> getByWorkOrder(@PathVariable Integer woId) {
        return taskService.getTasksForWorkOrder(woId);
    }

    @GetMapping("/{taskId}")
    @Operation(summary = "Get a single task by ID")
    public TaskResponse getById(@PathVariable Integer taskId) {
        return taskService.getById(taskId);
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN')")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create task")
    public TaskResponse create(@Valid @RequestBody CreateTaskRequest request) {
        return taskService.create(request);
    }
    
    @PutMapping("/{taskId}")
    @Operation(summary = "Update task details")
    public TaskResponse update(@PathVariable Integer taskId, @Valid @RequestBody UpdateTaskRequest request) {
        return taskService.update(taskId, request);
    }

    @PatchMapping("/{taskId}/complete")
    @Operation(summary = "Mark a task as DONE")
    public TaskResponse complete(@PathVariable Integer taskId, Principal principal) {
        return taskService.updateStatus(taskId, "DONE", null, principal.getName());
    }
    
    @PatchMapping("/{taskId}/status")
    @Operation(summary = "Update task status")
    public TaskResponse updateStatus(
            @PathVariable Integer taskId, 
            @RequestParam String status, 
            @RequestParam(required = false) String reason,
            Principal principal) {
        return taskService.updateStatus(taskId, status, reason, principal.getName());
    }

    @PatchMapping("/sub-tasks/{subTaskId}")
    @Operation(summary = "Toggle subtask completion")
    public void toggleSubTask(@PathVariable Integer subTaskId, @RequestParam boolean completed) {
        taskService.toggleSubTask(subTaskId, completed);
    }

    @DeleteMapping("/{taskId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a task")
    public void delete(@PathVariable Integer taskId) {
        taskService.delete(taskId);
    }

    @PatchMapping("/{taskId}/approval")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @Operation(summary = "Approve or reject an ad-hoc task")
    public TaskResponse updateApprovalStatus(@PathVariable Integer taskId, @RequestParam String status) {
        return taskService.updateApprovalStatus(taskId, status);
    }

    @PatchMapping("/{taskId}/replan-request")
    @Operation(summary = "Request a task replan (Technician)")
    public TaskResponse requestReplan(@PathVariable Integer taskId, @RequestParam String reason) {
        return taskService.requestReplan(taskId, reason);
    }

    @PatchMapping("/{taskId}/replan-approval")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @Operation(summary = "Approve or reject a replan request (Manager)")
    public TaskResponse updateReplanApproval(@PathVariable Integer taskId, @RequestParam String status) {
        return taskService.approveReplan(taskId, status);
    }

    @PatchMapping("/{taskId}/replan")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER')")
    @Operation(summary = "Directly replan a task (Manager)")
    public TaskResponse replan(@PathVariable Integer taskId, @RequestParam(required = false) String reason) {
        return taskService.replan(taskId, reason);
    }

    @PostMapping("/{taskId}/photos")
    @PreAuthorize("hasAnyRole('ADMIN', 'MAINTENANCE_MANAGER', 'TECHNICIAN')")
    @Operation(summary = "Upload photo for a task")
    public TaskResponse.TaskPhotoResponse uploadPhoto(
            @PathVariable Integer taskId,
            @RequestParam("file") MultipartFile file,
            @RequestParam("type") String type) throws IOException {
        return taskService.uploadPhoto(taskId, file, type);
    }

    @GetMapping("/{taskId}/photos/{photoId}/download")
    @Operation(summary = "Download/View task photo")
    public ResponseEntity<Resource> downloadPhoto(@PathVariable Integer taskId, @PathVariable Integer photoId) throws IOException {
        TaskService.PhotoFile photoFile = taskService.getPhotoFile(taskId, photoId);
        Resource resource = new UrlResource(photoFile.path().toUri());
        
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(photoFile.contentType()))
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + photoFile.fileName() + "\"")
                .body(resource);
    }
}

