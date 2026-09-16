package com.ems.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.ems.model.Employee;
import com.ems.model.Task;

public interface TaskRepository extends JpaRepository<Task, Long> {
    @EntityGraph(attributePaths = {"assignedTo", "assignedBy"})
    List<Task> findByAssignedToOrderByDueDateAsc(Employee employee);

    @EntityGraph(attributePaths = {"assignedTo", "assignedBy"})
    List<Task> findAllByOrderByCreatedAtDesc();

    @Override
    @EntityGraph(attributePaths = {"assignedTo", "assignedBy"})
    Optional<Task> findById(Long id);
}
