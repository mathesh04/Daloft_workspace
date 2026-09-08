package com.ems.model;
import jakarta.persistence.*; import java.time.LocalDateTime;
@Entity @Table(name="inventory_requests") public class InventoryRequest {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="component_id",nullable=false) private Component component;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="employee_id",nullable=false) private Employee employee;
 @Column(nullable=false) private Integer quantity; @Column(length=1000) private String purpose;
 @Enumerated(EnumType.STRING) @Column(nullable=false) private RequestStatus status=RequestStatus.PENDING;
 @Column(name="requested_at",nullable=false) private LocalDateTime requestedAt=LocalDateTime.now(); @Column(name="reviewed_at") private LocalDateTime reviewedAt; @Column(name="reviewed_by") private String reviewedBy; @Column(length=1000) private String adminRemark;
 public Long getId(){return id;} public Component getComponent(){return component;} public void setComponent(Component v){component=v;} public Employee getEmployee(){return employee;} public void setEmployee(Employee v){employee=v;} public Integer getQuantity(){return quantity;} public void setQuantity(Integer v){quantity=v;} public String getPurpose(){return purpose;} public void setPurpose(String v){purpose=v;} public RequestStatus getStatus(){return status;} public void setStatus(RequestStatus v){status=v;} public LocalDateTime getRequestedAt(){return requestedAt;} public LocalDateTime getReviewedAt(){return reviewedAt;} public void setReviewedAt(LocalDateTime v){reviewedAt=v;} public String getReviewedBy(){return reviewedBy;} public void setReviewedBy(String v){reviewedBy=v;} public String getAdminRemark(){return adminRemark;} public void setAdminRemark(String v){adminRemark=v;}
}
