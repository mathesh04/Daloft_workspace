package com.ems.model; 
import jakarta.persistence.*; 
import java.time.*; 

@Entity 
@Table(name="damage_reports") 
public class DamageReport { 
    @Id 
    @GeneratedValue(strategy=GenerationType.IDENTITY) 
    private Long id; 
    @ManyToOne 
    @JoinColumn(name="employee_id") 
    private Employee employee;
     private Long componentId;
      private String issueType;
       @Column(length=2000) 
       private String description;
        private String severity; 
        private String status="REPORTED";
         private LocalDateTime createdAt=LocalDateTime.now(); 
         public Long getId(){return id;} 
         public Employee getEmployee(){return employee;} 
         public void setEmployee(Employee e){employee=e;} 
         public Long getComponentId(){return componentId;} 
         public void setComponentId(Long v){componentId=v;}
          public String getIssueType(){return issueType;} 
          public void setIssueType(String v){issueType=v;}
           public String getDescription(){return description;}
            public void setDescription(String v){description=v;}
             public String getSeverity(){return severity;} 
             public void setSeverity(String v){severity=v;} 
             public String getStatus(){return status;} 
             public void setStatus(String v){status=v;} 
             public LocalDateTime getCreatedAt(){
                return createdAt;
            } 
        }
