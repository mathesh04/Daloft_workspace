package com.ems.repository;

import com.ems.model.Employee;
import com.ems.model.Task;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {
    @EntityGraph(attributePaths = {"assignedTo", "assignedBy"})
    List<Task> findByAssignedToOrderByDueDateAsc(Employee employee);

    @EntityGraph(attributePaths = {"assignedTo", "assignedBy"})
    List<Task> findAllByOrderByCreatedAtDesc();
}
