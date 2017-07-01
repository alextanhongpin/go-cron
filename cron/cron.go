package cron

import (
	"time"

	"github.com/robfig/cron"
)

// Task contains the metadata for our cron application
type Task struct {
	PrevExecution *time.Time `json:"prev_execution,omitempty"`
	NextExecution time.Time  `json:"next_execution"`
	StartTime     time.Time  `json:"start_time"`
	CurrentTime   time.Time  `json:"current_time"`
	IsExecuting   bool       `json:"is_executing"`
	IsRunning     bool       `json:"is_running"`
	Version       string     `json:"version"`
	Counter       int        `json:"counter"`
	JobName       string     `json:"job_name"`
	Spec          string     `json:"spec"`
	Cron          *cron.Cron `json:"-"`
}

func (c *Task) Start() {
	if !c.IsRunning {
		c.StartTime = time.Now()
		c.Counter = 0
	}
	c.Cron.Start()
	c.IsRunning = true
}

func (c *Task) Stop() {
	c.Cron.Stop()
	c.IsRunning = false
	c.IsExecuting = false
	c.Counter = 0
}

func (c *Task) Update() {

	entries := c.Cron.Entries()
	entry := entries[len(entries)-1]

	c.PrevExecution = &entry.Prev
	c.NextExecution = entry.Next
	c.CurrentTime = time.Now()
}

func (c Task) ParseSpec(spec string) error {
	specParser := cron.NewParser(cron.Second | cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)
	_, err := specParser.Parse(spec)
	return err
}

// NewCron creates a new cron with predefined metadatas
func New() *Task {
	return &Task{
		Cron:      cron.New(),
		Version:   "0.0.1",
		StartTime: time.Now(),
		JobName:   "Loop 10 seconds",
	}
}
