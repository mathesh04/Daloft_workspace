package com.ems.model;

import com.ems.util.TimeUtil;
import jakarta.persistence.*; import java.time.LocalDateTime;
@Entity @Table(name="stock_transactions") public class StockTransaction {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id; @ManyToOne(fetch=FetchType.EAGER) @JoinColumn(name="component_id",nullable=false) private Component component; @Enumerated(EnumType.STRING) @Column(name="transaction_type",nullable=false) private TransactionType transactionType; @Column(nullable=false) private Integer quantity; @Column(length=1000) private String purpose; @Column(name="created_by") private String createdBy; @Column(name="transaction_date",nullable=false) private LocalDateTime transactionDate=TimeUtil.now();
 public Long getId(){return id;} public Component getComponent(){return component;} public void setComponent(Component v){component=v;} public TransactionType getTransactionType(){return transactionType;} public void setTransactionType(TransactionType v){transactionType=v;} public Integer getQuantity(){return quantity;} public void setQuantity(Integer v){quantity=v;} public String getPurpose(){return purpose;} public void setPurpose(String v){purpose=v;} public String getCreatedBy(){return createdBy;} public void setCreatedBy(String v){createdBy=v;} public LocalDateTime getTransactionDate(){return transactionDate;}
}

