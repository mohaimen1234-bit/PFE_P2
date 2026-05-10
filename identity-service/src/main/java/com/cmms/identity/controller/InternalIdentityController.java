package com.cmms.identity.controller;

import com.cmms.identity.repository.DepartmentRepository;
import com.cmms.identity.repository.UserRepository;
import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
@Hidden // Hide internal endpoints from public Swagger documentation
public class InternalIdentityController {

    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;

    @GetMapping("/departments/{id}/exists")
    public ResponseEntity<Boolean> checkDepartmentExists(@PathVariable Integer id) {
        return ResponseEntity.ok(id != null && departmentRepository.existsById(id));
    }

    @GetMapping("/users/{id}/exists")
    public ResponseEntity<Boolean> checkUserExists(@PathVariable Integer id) {
        return ResponseEntity.ok(id != null && userRepository.existsById(id));
    }
}
