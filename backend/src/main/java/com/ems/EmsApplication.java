package com.ems;

import com.ems.model.Employee;
import com.ems.model.Role;
import com.ems.repository.EmployeeRepository;
import com.ems.repository.DepartmentRepository;
import com.ems.model.Department;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
public class EmsApplication {
 public static void main(String[] args){SpringApplication.run(EmsApplication.class,args);}
 @Bean 
  public PasswordEncoder passwordEncoder(){return new BCryptPasswordEncoder();}
 @Bean 
  public CommandLineRunner seedInitialAdmin(EmployeeRepository repo, DepartmentRepository departments, PasswordEncoder encoder, 
    @Value("${admin.employee-id:}") 
    String employeeId,@Value("${admin.password:}") 
    String password,@Value("${admin.name:System Administrator}") 
    String name,
    @Value("${admin.department:Administration}") 
    String department){
   return args->{if(departments.findByNameIgnoreCase("Administration").isEmpty()){
    Department d=new Department();
    d.setName("Administration");
    d.setActive(true);departments.save(d);
  } 
  if(department!=null&&!department.isBlank()&&departments.findByNameIgnoreCase(department.trim()).isEmpty()){
    Department d=new Department();d.setName(department.trim());
    d.setActive(true);departments.save(d);
  } 
  if(employeeId==null||employeeId.isBlank()||password==null||password.isBlank()){
    System.out.println("Initial admin seed skipped. Set ADMIN_EMPLOYEE_ID and ADMIN_PASSWORD only for first-time bootstrap.");
    return;
  } 
  var existing=repo.findByEmployeeId(employeeId); 
  if(existing.isPresent()){Employee a=existing.get(); 
    if(a.getRole()==Role.SYSTEM_ADMIN){
      System.out.println("Initial SYSTEM_ADMIN already exists; bootstrap made no changes.");
    } 
    else {
      System.out.println("Bootstrap skipped because ADMIN_EMPLOYEE_ID already belongs to a non-system account.");
    }
  } 
  else {
    Employee a=new Employee();
    a.setEmployeeId(employeeId.trim());a.setName(name);
    a.setPassword(encoder.encode(password));
    a.setRole(Role.SYSTEM_ADMIN);
    a.setDepartment(department);
    a.setActive(true);
    repo.save(a);
    System.out.println("Initial SYSTEM_ADMIN created successfully. Credentials are not printed to logs.");
  }
};
 }
}
